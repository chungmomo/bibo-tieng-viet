"""VietKid - website học tiếng Việt cho bé (song ngữ Việt - Nhật).

Backend Flask đơn giản: phục vụ trang web + API lưu tiến trình học
(hồ sơ bé, số sao, huy hiệu) bằng SQLite.
"""
import json
import sqlite3
from datetime import datetime
from pathlib import Path

from flask import Flask, g, jsonify, render_template, request, abort

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = BASE_DIR / "vietkid.db"

GAME_TYPES = ("matching", "quiz", "spelling")
MAX_STARS_PER_GAME = 3

app = Flask(__name__)


# ---------------------------------------------------------------------------
# Dữ liệu tĩnh (bảng chữ cái + từ vựng) - đọc 1 lần, giữ trong bộ nhớ
# ---------------------------------------------------------------------------
def _load_json(filename):
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


ALPHABET = _load_json("alphabet.json")
VOCABULARY = _load_json("vocabulary.json")
VOCAB_BY_ID = {topic["id"]: topic for topic in VOCABULARY}


# ---------------------------------------------------------------------------
# SQLite
# ---------------------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            avatar TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            topic_id TEXT NOT NULL,
            game_type TEXT NOT NULL,
            score INTEGER NOT NULL,
            stars INTEGER NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(profile_id, topic_id, game_type)
        );

        CREATE TABLE IF NOT EXISTS writing_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            letter_index INTEGER NOT NULL,
            score INTEGER NOT NULL,
            stars INTEGER NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(profile_id, letter_index)
        );
        """
    )
    db.commit()
    db.close()


# ---------------------------------------------------------------------------
# Huy hiệu / thành tích
# ---------------------------------------------------------------------------
MILESTONE_BADGES = [
    (10, "🌸", "Công chúa tập sự"),
    (25, "🎀", "Công chúa chăm chỉ"),
    (45, "💎", "Công chúa thông thái"),
    (70, "👑", "Nữ hoàng tiếng Việt"),
]

WRITING_MILESTONES = [
    (5, "✏️", "Bé mới cầm bút"),
    (15, "✍️", "Bé viết chăm chỉ"),
    (len(ALPHABET), "🖋️", "Chuyên gia viết chữ"),
]


def compute_summary(profile_id):
    db = get_db()
    rows = db.execute(
        "SELECT topic_id, game_type, score, stars FROM progress WHERE profile_id = ?",
        (profile_id,),
    ).fetchall()
    writing_rows = db.execute(
        "SELECT letter_index, score, stars FROM writing_progress WHERE profile_id = ?",
        (profile_id,),
    ).fetchall()

    by_topic = {}
    vocab_stars = 0
    for row in rows:
        vocab_stars += row["stars"]
        by_topic.setdefault(row["topic_id"], {})[row["game_type"]] = {
            "score": row["score"],
            "stars": row["stars"],
        }

    topics_summary = {}
    badges = []
    for topic in VOCABULARY:
        tid = topic["id"]
        games = by_topic.get(tid, {})
        stars_sum = sum(v["stars"] for v in games.values())
        mastered = all(
            games.get(gt, {}).get("stars", 0) >= 2 for gt in GAME_TYPES
        )
        topics_summary[tid] = {
            "name": topic["name"],
            "icon": topic["icon"],
            "games": games,
            "stars": stars_sum,
            "max_stars": len(GAME_TYPES) * MAX_STARS_PER_GAME,
            "mastered": mastered,
        }
        if mastered:
            badges.append(
                {
                    "id": f"master_{tid}",
                    "icon": topic["icon"],
                    "label": f"Chuyên gia {topic['name']}",
                }
            )

    writing_letters = {}
    writing_stars = 0
    for row in writing_rows:
        writing_stars += row["stars"]
        writing_letters[row["letter_index"]] = {"score": row["score"], "stars": row["stars"]}
    writing_practiced_count = len(writing_letters)

    for threshold, icon, label in WRITING_MILESTONES:
        if writing_practiced_count >= threshold:
            badges.append({"id": f"writing_{threshold}", "icon": icon, "label": label})

    total_stars = vocab_stars + writing_stars

    for threshold, icon, label in MILESTONE_BADGES:
        if total_stars >= threshold:
            badges.append({"id": f"milestone_{threshold}", "icon": icon, "label": label})

    return {
        "total_stars": total_stars,
        "topics": topics_summary,
        "writing": {
            "letters": writing_letters,
            "practiced_count": writing_practiced_count,
            "total_letters": len(ALPHABET),
            "stars": writing_stars,
            "max_stars": len(ALPHABET) * MAX_STARS_PER_GAME,
        },
        "badges": badges,
    }


# ---------------------------------------------------------------------------
# Trang web
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/alphabet")
def alphabet_page():
    return render_template("alphabet.html")


@app.route("/topics")
def topics_page():
    return render_template("topics.html", topics=VOCABULARY)


@app.route("/topics/<topic_id>")
def vocabulary_page(topic_id):
    topic = VOCAB_BY_ID.get(topic_id)
    if not topic:
        abort(404)
    return render_template("vocabulary.html", topic=topic)


@app.route("/games/<topic_id>/matching")
def game_matching(topic_id):
    topic = VOCAB_BY_ID.get(topic_id)
    if not topic:
        abort(404)
    return render_template("games/matching.html", topic=topic)


@app.route("/games/<topic_id>/quiz")
def game_quiz(topic_id):
    topic = VOCAB_BY_ID.get(topic_id)
    if not topic:
        abort(404)
    return render_template("games/quiz.html", topic=topic)


@app.route("/games/<topic_id>/spelling")
def game_spelling(topic_id):
    topic = VOCAB_BY_ID.get(topic_id)
    if not topic:
        abort(404)
    return render_template("games/spelling.html", topic=topic)


@app.route("/progress")
def progress_page():
    return render_template("progress.html")


@app.route("/writing")
def writing_page():
    return render_template("writing.html", letters=ALPHABET)


@app.route("/writing/<int:letter_index>")
def writing_practice_page(letter_index):
    if letter_index < 0 or letter_index >= len(ALPHABET):
        abort(404)
    return render_template(
        "writing_practice.html",
        letter=ALPHABET[letter_index],
        letter_index=letter_index,
        total_letters=len(ALPHABET),
    )


# ---------------------------------------------------------------------------
# API - dữ liệu học tập
# ---------------------------------------------------------------------------
@app.route("/api/alphabet")
def api_alphabet():
    return jsonify(ALPHABET)


@app.route("/api/vocabulary")
def api_vocabulary():
    return jsonify(VOCABULARY)


@app.route("/api/vocabulary/<topic_id>")
def api_vocabulary_topic(topic_id):
    topic = VOCAB_BY_ID.get(topic_id)
    if not topic:
        return jsonify({"error": "Không tìm thấy chủ đề"}), 404
    return jsonify(topic)


# ---------------------------------------------------------------------------
# API - hồ sơ bé
# ---------------------------------------------------------------------------
AVATARS = ["👸", "🧚‍♀️", "🦄", "🧜‍♀️", "🎀", "🐰", "🐱", "🐻", "🐨", "🦋"]


@app.route("/api/avatars")
def api_avatars():
    return jsonify(AVATARS)


@app.route("/api/profiles", methods=["GET", "POST"])
def api_profiles():
    db = get_db()
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        name = (payload.get("name") or "").strip()
        avatar = (payload.get("avatar") or AVATARS[0]).strip()
        if not name:
            return jsonify({"error": "Vui lòng nhập tên bé"}), 400
        if len(name) > 40:
            return jsonify({"error": "Tên quá dài"}), 400
        cur = db.execute(
            "INSERT INTO profiles (name, avatar, created_at) VALUES (?, ?, ?)",
            (name, avatar, datetime.utcnow().isoformat()),
        )
        db.commit()
        profile_id = cur.lastrowid
        return jsonify({"id": profile_id, "name": name, "avatar": avatar, "total_stars": 0}), 201

    rows = db.execute("SELECT id, name, avatar FROM profiles ORDER BY id").fetchall()
    profiles = []
    for row in rows:
        summary = compute_summary(row["id"])
        profiles.append(
            {
                "id": row["id"],
                "name": row["name"],
                "avatar": row["avatar"],
                "total_stars": summary["total_stars"],
            }
        )
    return jsonify(profiles)


@app.route("/api/profiles/<int:profile_id>", methods=["GET", "DELETE"])
def api_profile_detail(profile_id):
    db = get_db()
    row = db.execute("SELECT id, name, avatar FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    if not row:
        return jsonify({"error": "Không tìm thấy hồ sơ"}), 404

    if request.method == "DELETE":
        db.execute("DELETE FROM progress WHERE profile_id = ?", (profile_id,))
        db.execute("DELETE FROM writing_progress WHERE profile_id = ?", (profile_id,))
        db.execute("DELETE FROM profiles WHERE id = ?", (profile_id,))
        db.commit()
        return jsonify({"ok": True})

    summary = compute_summary(profile_id)
    return jsonify(
        {
            "id": row["id"],
            "name": row["name"],
            "avatar": row["avatar"],
            **summary,
        }
    )


# ---------------------------------------------------------------------------
# API - tiến trình / điểm số
# ---------------------------------------------------------------------------
@app.route("/api/progress", methods=["POST"])
def api_save_progress():
    payload = request.get_json(silent=True) or {}
    profile_id = payload.get("profile_id")
    topic_id = payload.get("topic_id")
    game_type = payload.get("game_type")
    score = payload.get("score")
    stars = payload.get("stars")

    if not all([profile_id, topic_id, game_type]) or score is None or stars is None:
        return jsonify({"error": "Thiếu dữ liệu"}), 400
    if game_type not in GAME_TYPES:
        return jsonify({"error": "game_type không hợp lệ"}), 400
    if topic_id not in VOCAB_BY_ID:
        return jsonify({"error": "topic_id không hợp lệ"}), 400

    try:
        score = int(score)
        stars = max(0, min(MAX_STARS_PER_GAME, int(stars)))
    except (TypeError, ValueError):
        return jsonify({"error": "score/stars phải là số"}), 400

    db = get_db()
    profile = db.execute("SELECT id FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    if not profile:
        return jsonify({"error": "Không tìm thấy hồ sơ"}), 404

    existing = db.execute(
        "SELECT score, stars FROM progress WHERE profile_id=? AND topic_id=? AND game_type=?",
        (profile_id, topic_id, game_type),
    ).fetchone()

    now = datetime.utcnow().isoformat()
    if existing:
        best_score = max(existing["score"], score)
        best_stars = max(existing["stars"], stars)
        db.execute(
            """UPDATE progress SET score=?, stars=?, updated_at=?
               WHERE profile_id=? AND topic_id=? AND game_type=?""",
            (best_score, best_stars, now, profile_id, topic_id, game_type),
        )
    else:
        db.execute(
            """INSERT INTO progress (profile_id, topic_id, game_type, score, stars, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (profile_id, topic_id, game_type, score, stars, now),
        )
    db.commit()

    return jsonify(compute_summary(profile_id))


@app.route("/api/progress/<int:profile_id>")
def api_get_progress(profile_id):
    db = get_db()
    profile = db.execute("SELECT id FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    if not profile:
        return jsonify({"error": "Không tìm thấy hồ sơ"}), 404
    return jsonify(compute_summary(profile_id))


# ---------------------------------------------------------------------------
# API - tập viết chữ
# ---------------------------------------------------------------------------
@app.route("/api/writing-progress", methods=["POST"])
def api_save_writing_progress():
    payload = request.get_json(silent=True) or {}
    profile_id = payload.get("profile_id")
    letter_index = payload.get("letter_index")
    score = payload.get("score")
    stars = payload.get("stars")

    if profile_id is None or letter_index is None or score is None or stars is None:
        return jsonify({"error": "Thiếu dữ liệu"}), 400

    try:
        letter_index = int(letter_index)
        score = max(0, min(100, int(score)))
        stars = max(0, min(MAX_STARS_PER_GAME, int(stars)))
    except (TypeError, ValueError):
        return jsonify({"error": "Dữ liệu không hợp lệ"}), 400

    if letter_index < 0 or letter_index >= len(ALPHABET):
        return jsonify({"error": "letter_index không hợp lệ"}), 400

    db = get_db()
    profile = db.execute("SELECT id FROM profiles WHERE id = ?", (profile_id,)).fetchone()
    if not profile:
        return jsonify({"error": "Không tìm thấy hồ sơ"}), 404

    existing = db.execute(
        "SELECT score, stars FROM writing_progress WHERE profile_id=? AND letter_index=?",
        (profile_id, letter_index),
    ).fetchone()

    now = datetime.utcnow().isoformat()
    if existing:
        best_score = max(existing["score"], score)
        best_stars = max(existing["stars"], stars)
        db.execute(
            """UPDATE writing_progress SET score=?, stars=?, updated_at=?
               WHERE profile_id=? AND letter_index=?""",
            (best_score, best_stars, now, profile_id, letter_index),
        )
    else:
        db.execute(
            """INSERT INTO writing_progress (profile_id, letter_index, score, stars, updated_at)
               VALUES (?, ?, ?, ?, ?)""",
            (profile_id, letter_index, score, stars, now),
        )
    db.commit()

    return jsonify(compute_summary(profile_id))


if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5000, threaded=True)
else:
    init_db()
