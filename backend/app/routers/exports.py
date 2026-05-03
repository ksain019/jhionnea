"""Export and download system for generated content."""

import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/exports", tags=["exports"])


class ExportRequest(BaseModel):
    content: str
    title: str
    format: str = "txt"
    content_type: str = "novel"


@router.post("/download")
async def export_content(
    data: ExportRequest,
    current_user: User = Depends(get_current_user),
):
    """Export content as a downloadable file."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_title = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in data.title
    ).strip()

    if data.format == "json":
        output = json.dumps(
            {
                "title": data.title,
                "content_type": data.content_type,
                "content": data.content,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "author": current_user.full_name,
            },
            indent=2,
        )
        media_type = "application/json"
        ext = "json"
    elif data.format == "md":
        output = f"# {data.title}\n\n"
        output += f"*Author: {current_user.full_name}*\n"
        output += f"*Exported: {timestamp}*\n\n---\n\n"
        output += data.content
        media_type = "text/markdown"
        ext = "md"
    elif data.format == "html":
        output = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{data.title}</title>
<style>
body {{ font-family: Georgia, serif; max-width: 800px;
margin: 40px auto; padding: 20px; line-height: 1.8;
color: #333; }}
h1 {{ text-align: center; margin-bottom: 40px; }}
.meta {{ text-align: center; color: #666;
font-style: italic; margin-bottom: 40px; }}
</style>
</head>
<body>
<h1>{data.title}</h1>
<p class="meta">By {current_user.full_name} &mdash; {timestamp}</p>
<div>{data.content.replace(chr(10), '<br>')}</div>
</body>
</html>"""
        media_type = "text/html"
        ext = "html"
    else:
        output = f"{data.title}\n"
        output += f"By {current_user.full_name}\n"
        output += f"Exported: {timestamp}\n"
        output += "=" * 60 + "\n\n"
        output += data.content
        media_type = "text/plain"
        ext = "txt"

    buf = io.BytesIO(output.encode("utf-8"))
    filename = f"{safe_title}_{timestamp}.{ext}"

    return StreamingResponse(
        buf,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


@router.post("/novel")
async def export_novel(
    data: ExportRequest,
    current_user: User = Depends(get_current_user),
):
    """Export a novel in formatted HTML (print-ready)."""
    chapters = data.content.split("\n\n")
    html_chapters = ""
    for i, ch in enumerate(chapters):
        if ch.strip():
            html_chapters += (
                f'<div class="chapter">'
                f"<h2>Chapter {i + 1}</h2>"
                f"<p>{ch.replace(chr(10), '</p><p>')}</p>"
                f"</div>\n"
            )

    output = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{data.title}</title>
<style>
@page {{ size: 6in 9in; margin: 0.75in; }}
body {{ font-family: Garamond, Georgia, serif; font-size: 12pt;
line-height: 1.6; color: #000; }}
h1 {{ text-align: center; font-size: 24pt; margin: 2in 0 0.5in; }}
h2 {{ text-align: center; font-size: 16pt; margin-top: 2in;
page-break-before: always; }}
.chapter {{ margin-bottom: 2em; }}
.copyright {{ text-align: center; font-size: 10pt; margin-top: 3in; }}
.dedication {{ text-align: center; font-style: italic;
margin-top: 3in; page-break-after: always; }}
p {{ text-indent: 0.5in; margin: 0.3em 0; }}
</style>
</head>
<body>
<h1>{data.title}</h1>
<p style="text-align:center; font-size: 14pt;">
By {current_user.full_name}</p>
<div class="copyright">
<p>Copyright &copy; {datetime.now().year} {current_user.full_name}</p>
<p>All rights reserved.</p>
</div>
<div class="dedication">
<p>For those who believe in love.</p>
</div>
{html_chapters}
<div style="text-align:center; margin-top:3in;">
<h2>About the Author</h2>
<p>{current_user.full_name} is a romance author
and educator.</p>
</div>
</body>
</html>"""

    buf = io.BytesIO(output.encode("utf-8"))
    safe_title = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in data.title
    ).strip()
    filename = f"{safe_title}_novel.html"

    return StreamingResponse(
        buf,
        media_type="text/html",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


@router.post("/workbook")
async def export_workbook(
    data: ExportRequest,
    current_user: User = Depends(get_current_user),
):
    """Export a workbook in formatted HTML (print-ready)."""
    output = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{data.title}</title>
<style>
@page {{ size: 8.5in 11in; margin: 1in; }}
body {{ font-family: 'Arial', sans-serif; font-size: 12pt;
line-height: 1.5; color: #000; }}
h1 {{ text-align: center; font-size: 22pt; color: #2563eb;
margin: 1in 0 0.5in; }}
h2 {{ font-size: 16pt; color: #2563eb; border-bottom: 2px solid #2563eb;
padding-bottom: 0.2em; page-break-before: always; }}
h3 {{ font-size: 13pt; color: #4f46e5; }}
.worksheet {{ border: 1px solid #ddd; padding: 1em; margin: 1em 0;
border-radius: 8px; background: #fafafa; }}
.answer-line {{ border-bottom: 1px solid #999; display: block;
height: 1.5em; margin: 0.5em 0; }}
.toc {{ margin: 1em 0; }}
.toc li {{ margin: 0.3em 0; }}
</style>
</head>
<body>
<h1>{data.title}</h1>
<p style="text-align:center;">By {current_user.full_name}</p>
<h2>Table of Contents</h2>
<ul class="toc">
<li>Teacher Notes</li>
<li>Student Introduction</li>
<li>Units 1-10</li>
<li>Answer Key</li>
</ul>
<h2>Teacher Notes</h2>
<p>This workbook contains 10 units with 10-15 worksheets each,
covering reading, math, science, art, CTE, and health.</p>
<h2>Student Introduction</h2>
<p>Welcome! Work through each unit at your own pace.
Complete the exit ticket at the end of each unit.</p>
{data.content}
<h2>Answer Key</h2>
<p>Answers for all worksheets follow. For teacher use only.</p>
</body>
</html>"""

    buf = io.BytesIO(output.encode("utf-8"))
    safe_title = "".join(
        c if c.isalnum() or c in (" ", "-", "_") else "_"
        for c in data.title
    ).strip()
    filename = f"{safe_title}_workbook.html"

    return StreamingResponse(
        buf,
        media_type="text/html",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


@router.get("/formats")
async def list_formats(
    current_user: User = Depends(get_current_user),
):
    """List available export formats."""
    return {
        "formats": [
            {
                "id": "txt",
                "name": "Plain Text",
                "ext": ".txt",
                "desc": "Simple text file",
            },
            {
                "id": "md",
                "name": "Markdown",
                "ext": ".md",
                "desc": "Formatted markdown",
            },
            {
                "id": "html",
                "name": "HTML",
                "ext": ".html",
                "desc": "Web page format",
            },
            {
                "id": "json",
                "name": "JSON",
                "ext": ".json",
                "desc": "Structured data format",
            },
            {
                "id": "novel",
                "name": "Novel (Print-Ready)",
                "ext": ".html",
                "desc": "6x9 trim, Garamond, chapter breaks",
            },
            {
                "id": "workbook",
                "name": "Workbook (Print-Ready)",
                "ext": ".html",
                "desc": "8.5x11, worksheets, answer key",
            },
        ]
    }
