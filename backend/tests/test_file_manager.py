import tempfile
from pathlib import Path
from app.storage.file_manager import FileManager
from app.schemas.types import TrackMetadata

def test_file_manager_path_generation():
    with tempfile.TemporaryDirectory() as tmpdir:
        track = TrackMetadata(
            id="test_1",
            title="Espresso: Special Edition",
            artist="Sabrina Carpenter / Island",
            album="Short n' Sweet (Deluxe)",
            track_number=1,
        )

        output_path = FileManager.get_output_path(track, extension="mp3", custom_base_dir=tmpdir)
        assert output_path.exists() is False
        assert "Sabrina Carpenter - Island" in str(output_path)
        assert "01 - Espresso- Special Edition.mp3" in output_path.name

def test_file_manager_folder_organization_playlist():
    with tempfile.TemporaryDirectory() as tmpdir:
        track = TrackMetadata(
            id="test_p",
            title="Espresso: Special Edition",
            artist="Sabrina Carpenter / Island",
            album="Short n' Sweet (Deluxe)",
            track_number=1,
        )

        output_path = FileManager.get_output_path(
            track,
            extension="mp3",
            custom_base_dir=tmpdir,
            folder_organization="playlist",
            playlist_name="Top Summer Hits / Chill",
        )
        assert "Top Summer Hits - Chill" in str(output_path)
        # In playlist mode, filename should default to {title} without track number
        assert output_path.name == "Espresso- Special Edition.mp3"

def test_file_manager_folder_organization_album():
    with tempfile.TemporaryDirectory() as tmpdir:
        track = TrackMetadata(
            id="test_a",
            title="Espresso: Special Edition",
            artist="Sabrina Carpenter / Island",
            album="Short n' Sweet (Deluxe)",
            track_number=1,
        )

        output_path = FileManager.get_output_path(
            track,
            extension="mp3",
            custom_base_dir=tmpdir,
            folder_organization="album",
        )
        # In album mode, folder is only album, not artist
        assert "Sabrina Carpenter" not in str(output_path.parent.name)
        assert "Short n' Sweet (Deluxe)" in str(output_path)
        assert output_path.name == "01 - Espresso- Special Edition.mp3"

def test_file_manager_avoid_overwrite():
    with tempfile.TemporaryDirectory() as tmpdir:
        track = TrackMetadata(
            id="test_2",
            title="Song",
            artist="Artist",
            album="Album",
            track_number=2,
        )

        p1 = FileManager.get_output_path(track, extension="mp3", custom_base_dir=tmpdir)
        p1.touch() # Create dummy file

        p2 = FileManager.get_output_path(track, extension="mp3", custom_base_dir=tmpdir)
        assert p2 != p1
        assert " (1).mp3" in p2.name
