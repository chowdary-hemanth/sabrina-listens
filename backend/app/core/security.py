import ipaddress
import re
import socket
from urllib.parse import urlparse
from typing import Tuple

# Disallowed hostnames
BLOCKED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "metadata.google.internal",
    "instance-data",
}

# Regex for illegal file system characters (Windows, Linux, macOS)
ILLEGAL_FILENAME_CHARS = re.compile(r'[\\/:*?"<>|]')
CONTROL_CHARS = re.compile(r'[\x00-\x1f\x7f-\x9f]')

class SecurityError(Exception):
    """Raised when a security validation fails."""
    pass

def is_ip_private_or_restricted(ip_str: str) -> bool:
    """Checks whether an IP address belongs to private, loopback, link-local or reserved ranges."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private or
            ip.is_loopback or
            ip.is_link_local or
            ip.is_reserved or
            ip.is_multicast or
            ip == ipaddress.ip_address("169.254.169.254")  # Cloud metadata
        )
    except ValueError:
        # Not an IP address string
        return False

def validate_external_url(url: str) -> Tuple[bool, str]:
    """
    Validates a URL against SSRF vulnerabilities:
    - Enforces http or https scheme.
    - Disallows credentials in URL (user:pass@host).
    - Checks for blocked hostnames.
    - Performs DNS resolution to detect internal/private IPs.
    """
    if not url or not isinstance(url, str):
        return False, "URL must be a non-empty string"

    url = url.strip()
    if len(url) > 2048:
        return False, "URL length exceeds limit of 2048 characters"

    try:
        parsed = urlparse(url)
    except Exception as e:
        return False, f"Malformed URL: {e}"

    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"Unsupported scheme '{parsed.scheme}'. Only HTTP and HTTPS are permitted."

    if not parsed.hostname:
        return False, "URL is missing a valid hostname"

    hostname = parsed.hostname.lower()

    if parsed.username or parsed.password:
        return False, "URLs containing embedded user credentials are not allowed"

    if hostname in BLOCKED_HOSTNAMES:
        return False, f"Access to '{hostname}' is blocked for security reasons"

    # Check if hostname itself is a private IP
    if is_ip_private_or_restricted(hostname):
        return False, f"Access to private IP address '{hostname}' is prohibited"

    # Resolve hostname via DNS and check resolved IP addresses
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        for family, _, _, _, sockaddr in addr_info:
            ip = sockaddr[0]
            if is_ip_private_or_restricted(ip):
                return False, f"Host '{hostname}' resolves to restricted internal IP '{ip}'"
    except socket.gaierror:
        # DNS lookup failure (offline / mock / nonexistent)
        pass
    except Exception as e:
        return False, f"DNS validation error: {e}"

    return True, ""

def sanitize_filename(name: str, max_length: int = 120, default: str = "track") -> str:
    """
    Sanitizes a string to be safely used as a filename on any platform.
    Removes forbidden characters, control characters, and collapses whitespace.
    """
    if not name:
        return default

    # Replace forbidden filesystem characters with dash
    cleaned = ILLEGAL_FILENAME_CHARS.sub("-", name)
    cleaned = CONTROL_CHARS.sub("", cleaned)
    # Collapse multiple spaces or dashes
    cleaned = re.sub(r'[\s_]+', ' ', cleaned).strip()

    # Strip leading/trailing dots/spaces but keep interior dots
    cleaned = cleaned.strip('. ')

    if not cleaned:
        return default

    # Limit length
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length].rstrip('. ')

    return cleaned or default

def sanitize_path_component(component: str) -> str:
    """Sanitizes directory component names, preventing path traversal (..)."""
    raw = component.strip()
    if raw in (".", "..") or raw.replace(".", "") == "":
        return "unnamed"

    sanitized = sanitize_filename(component)
    if not sanitized or sanitized in (".", ".."):
        return "unnamed"
    return sanitized
