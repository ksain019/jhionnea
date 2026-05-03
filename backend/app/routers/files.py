"""File storage and management system."""

import os
import shutil
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse

from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/files", tags=["files"])

STORAGE_DIR = "/data/files"


def _ensure_dir(user_id: int, folder: str = "") -> str:
    path = os.path.join(STORAGE_DIR, str(user_id), folder)
    os.makedirs(path, exist_ok=True)
    return path


@router.get("")
async def list_files(
    folder: str = "",
    current_user: User = Depends(get_current_user),
):
    """List files in a folder."""
    base = _ensure_dir(current_user.id, folder)
    items = []
    try:
        for entry in os.scandir(base):
            info = entry.stat()
            items.append({
                "name": entry.name,
                "type": "folder" if entry.is_dir() else "file",
                "size_bytes": info.st_size if entry.is_file() else 0,
                "size_mb": round(info.st_size / (1024 * 1024), 2)
                if entry.is_file()
                else 0,
                "modified": datetime.fromtimestamp(
                    info.st_mtime, tz=timezone.utc
                ).isoformat(),
                "path": os.path.join(folder, entry.name)
                if folder
                else entry.name,
            })
    except FileNotFoundError:
        pass
    items.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))
    return {"files": items, "folder": folder}


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form(""),
    current_user: User = Depends(get_current_user),
):
    """Upload a file."""
    base = _ensure_dir(current_user.id, folder)
    safe_name = "".join(
        c if c.isalnum() or c in (".", "-", "_", " ") else "_"
        for c in (file.filename or "upload")
    )
    filepath = os.path.join(base, safe_name)

    # Prevent overwrite — append timestamp
    if os.path.exists(filepath):
        name, ext = os.path.splitext(safe_name)
        ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        safe_name = f"{name}_{ts}{ext}"
        filepath = os.path.join(base, safe_name)

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    return {
        "filename": safe_name,
        "path": os.path.join(folder, safe_name) if folder else safe_name,
        "size_bytes": len(content),
        "size_mb": round(len(content) / (1024 * 1024), 2),
    }


@router.post("/folder")
async def create_folder(
    name: str = Form(...),
    parent: str = Form(""),
    current_user: User = Depends(get_current_user),
):
    """Create a folder."""
    safe_name = "".join(
        c if c.isalnum() or c in ("-", "_", " ") else "_"
        for c in name
    )
    full_path = os.path.join(parent, safe_name) if parent else safe_name
    _ensure_dir(current_user.id, full_path)
    return {"folder": full_path}


@router.get("/download/{filepath:path}")
async def download_file(
    filepath: str,
    current_user: User = Depends(get_current_user),
):
    """Download a file."""
    # Prevent directory traversal
    if ".." in filepath:
        return {"detail": "Invalid path"}
    base = _ensure_dir(current_user.id)
    full = os.path.join(base, filepath)
    if not os.path.isfile(full):
        return {"detail": "File not found"}
    return FileResponse(full, filename=os.path.basename(full))


@router.delete("/{filepath:path}")
async def delete_file(
    filepath: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a file or folder."""
    if ".." in filepath:
        return {"detail": "Invalid path"}
    base = _ensure_dir(current_user.id)
    full = os.path.join(base, filepath)
    if os.path.isfile(full):
        os.remove(full)
        return {"deleted": filepath}
    elif os.path.isdir(full):
        shutil.rmtree(full)
        return {"deleted": filepath}
    return {"detail": "Not found"}


@router.get("/storage-info")
async def storage_info(
    current_user: User = Depends(get_current_user),
):
    """Get storage usage info."""
    base = _ensure_dir(current_user.id)
    total_size = 0
    file_count = 0
    folder_count = 0
    for root, dirs, files in os.walk(base):
        folder_count += len(dirs)
        for f in files:
            file_count += 1
            total_size += os.path.getsize(os.path.join(root, f))

    return {
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "file_count": file_count,
        "folder_count": folder_count,
        "storage_path": base,
    }
