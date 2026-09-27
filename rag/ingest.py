import re
from pathlib import Path

def parse_sop(filepath: str, pack_name: str):
    text = Path(filepath).read_text()
    sections = re.split(r"\n## ", text)[1:]  # drop preamble
    parsed = []
    for sec in sections:
        lines = sec.strip().split("\n")
        section_id = lines[0].strip()
        title_line = next((l for l in lines if l.startswith("**Title:**")), "")
        title = title_line.replace("**Title:**", "").strip()
        body = "\n".join(lines)
        parsed.append({
            "id": section_id,
            "title": title,
            "text": body,
            "pack": pack_name
        })
    return parsed

if __name__ == "__main__":
    sections = parse_sop("data/campus_sop.md", "campus")
    print(f"Parsed {len(sections)} sections")