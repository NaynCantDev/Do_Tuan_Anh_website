#!/usr/bin/env python3
"""render.py – đọc students/<id>/data.yaml → sinh website tĩnh vào dist/

Mỗi lần render ra website của ĐÚNG 1 sinh viên (dist/index.html là trang chủ).
Cách dùng:
    python scripts/render.py                  # nếu students/ chỉ có 1 người
    python scripts/render.py do_tuan_anh      # chỉ định người cần render
"""

import re
import shutil
import sys
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = ROOT / "template"
ASSETS_DIR = TEMPLATE_DIR / "assets"
STUDENTS_DIR = ROOT / "students"
DIST_DIR = ROOT / "dist"

def split_principles(text):
    """'Bộ 5 nguyên tắc: (1) A, (2) B' → ('Bộ 5 nguyên tắc:', ['A', 'B'])"""
    parts = re.split(r"\(\d+\)\s*", text or "")
    if len(parts) < 3:
        return None
    head = parts[0].strip()
    items = [p.strip().rstrip(",.;") for p in parts[1:] if p.strip()]
    return {"head": head, "items": items}


def classify_step(line):
    """Phân loại 1 dòng trong 'process' để tô màu timeline."""
    low = line.lower()
    if low.startswith("khó khăn"):
        return "challenge"
    if low.startswith("ai:"):
        return "ai"
    return "step"


def is_blank(v):
    """True nếu ô dữ liệu còn trống hoặc chỉ là placeholder '…'."""
    if v is None:
        return True
    if isinstance(v, (list, tuple)):
        return all(is_blank(x) for x in v)
    t = str(v).strip()
    return t in ("", "…", "...") or t.endswith(": …") or t.endswith(": ...")


def parse_tree(lines):
    """'2|f|GhiChu.txt|new' -> dict(depth, kind, name, state)"""
    out = []
    for ln in lines or []:
        d, k, n, st = (str(ln).split("|") + ["", "", "", ""])[:4]
        out.append({"d": int(d or 0), "k": k, "n": n, "s": st})
    return out


def make_env():
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["principles"] = split_principles
    env.filters["step_kind"] = classify_step
    env.tests["blank"] = is_blank
    env.filters["tree"] = parse_tree
    return env


def load(student_id):
    with open(STUDENTS_DIR / student_id / "data.yaml", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    data["slug"] = student_id
    # Nội dung chi tiết từng bài có thể tách ra students/<id>/bai<N>.yaml
    # (ghi đè các khóa tương ứng của projects[id=N]); tương tự conclusion.yaml.
    for p in data["projects"]:
        extra = STUDENTS_DIR / student_id / f"bai{p['id']}.yaml"
        if extra.exists():
            with open(extra, encoding="utf-8") as f:
                p.update(yaml.safe_load(f) or {})
    extra = STUDENTS_DIR / student_id / "conclusion.yaml"
    if extra.exists():
        with open(extra, encoding="utf-8") as f:
            data["conclusion"] = yaml.safe_load(f)
    return data


def write(out_dir, name, html):
    (out_dir / name).write_text(html, encoding="utf-8")
    print(f"  [OK] {name}")


def render_student(env, student_id):
    """Render 1 sinh viên thẳng vào dist/ (index.html nằm ngay ở gốc site)."""
    data = load(student_id)
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(parents=True)
    shutil.copytree(ASSETS_DIR, DIST_DIR / "assets")
    (DIST_DIR / ".nojekyll").write_text("", encoding="utf-8")

    # Ảnh đại diện (tùy chọn): students/<id>/<file> → dist/assets/<file>
    if data.get("avatar"):
        src = STUDENTS_DIR / student_id / data["avatar"]
        if src.exists():
            shutil.copy(src, DIST_DIR / "assets" / src.name)
            data["avatar_url"] = f"assets/{src.name}"
            print(f"  [OK] avatar: {src.name}")
        else:
            print(f"  [WARN] không thấy ảnh {src} → dùng emoji")

    # Ảnh minh họa cho từng bài: product.gallery[].file (đường dẫn tương đối trong students/<id>/)
    img_dir = DIST_DIR / "assets" / "img"
    for p in data["projects"]:
        prod = p.get("product") or {}
        kept = []
        for g in prod.get("gallery") or []:
            src = STUDENTS_DIR / student_id / g["file"]
            if src.exists():
                img_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy(src, img_dir / src.name)
                kept.append({**g, "src": f"assets/img/{src.name}"})
                print(f"  [OK] ảnh bài {p['id']}: {src.name}")
            else:
                print(f"  [WARN] bài {p['id']}: không thấy {src} → bỏ qua")
        if prod:
            prod["gallery"] = kept
        # Mọi ảnh nằm trong khối (shots[].file, img.file, …): duyệt đệ quy,
        # dict nào có khóa "file" là ảnh → chép vào dist/assets/img/, gán "src".
        def walk(node):
            if isinstance(node, dict):
                f = node.get("file")
                if isinstance(f, str) and f.startswith("images/"):
                    src = STUDENTS_DIR / student_id / f
                    if src.exists():
                        img_dir.mkdir(parents=True, exist_ok=True)
                        name = f"{src.parent.name}_{src.name}"
                        shutil.copy(src, img_dir / name)
                        node["src"] = f"assets/img/{name}"
                    else:
                        print(f"  [WARN] bài {p['id']}: không thấy ảnh {src}")
                for v in node.values():
                    walk(v)
            elif isinstance(node, list):
                for v in node:
                    walk(v)
        walk(prod.get("blocks") or [])
        # Ảnh chụp từng phiên bản prompt (khối prompt_lab): versions[].shot
        for blk in (prod.get("blocks") or []):
            if blk.get("type") != "prompt_lab":
                continue
            for it in blk.get("items") or []:
                for v in it.get("versions") or []:
                    if not v.get("shot"):
                        continue
                    src = STUDENTS_DIR / student_id / v["shot"]
                    if src.exists():
                        img_dir.mkdir(parents=True, exist_ok=True)
                        shutil.copy(src, img_dir / src.name)
                        v["shot_src"] = f"assets/img/{src.name}"
                    else:
                        print(f"  [WARN] bài {p['id']}: không thấy ảnh {src}")

    write(DIST_DIR, "index.html", env.get_template("index.html.j2").render(**data, page="home"))
    write(DIST_DIR, "projects.html", env.get_template("projects.html.j2").render(**data, page="projects"))

    projects = data["projects"]
    for i, p in enumerate(projects):
        prev_p = projects[i - 1] if i > 0 else None
        next_p = projects[i + 1] if i < len(projects) - 1 else None
        html = env.get_template("project.html.j2").render(
            **data, page="projects", project=p, prev_p=prev_p, next_p=next_p
        )
        write(DIST_DIR, f"project-{p['id']}.html", html)

    write(DIST_DIR, "conclusion.html", env.get_template("conclusion.html.j2").render(**data, page="conclusion"))


def main():
    all_ids = sorted(d.name for d in STUDENTS_DIR.iterdir() if (d / "data.yaml").exists())
    if len(sys.argv) > 1:
        student_id = sys.argv[1]
    elif len(all_ids) == 1:
        student_id = all_ids[0]
    else:
        sys.exit(f"Có {len(all_ids)} sinh viên trong students/: {all_ids}\n"
                 "Hãy chỉ định 1 người: python scripts/render.py <ma_sv>")
    if student_id not in all_ids:
        sys.exit(f"Không tìm thấy students/{student_id}/data.yaml")
    print(f"=== Rendering: {student_id} → dist/ ===")
    render_student(make_env(), student_id)


if __name__ == "__main__":
    main()
