from werkzeug.security import generate_password_hash

from backend import create_app, db
from backend.models.exam_models import Candidate, Exam, ExamAssignment, ExamSession, Question


FAKE_CANDIDATE_EMAILS = {"alice@example.com", "bob@example.com", "carol@example.com"}
REAL_CANDIDATE_SEEDS = {
    "vaishu@instituion.edu": {"name": "Vaishu", "password": "vaishu@787"},
    "monisha@instituion.edu": {"name": "Monisha", "password": "monisha@0703"},
}


def _prune_fake_candidates():
    candidates = db.session.query(Candidate).all()
    for candidate in candidates:
        normalized_email = (candidate.email or "").strip().lower()
        if normalized_email in FAKE_CANDIDATE_EMAILS or (normalized_email.endswith("@example.com") and normalized_email != "admin@gmail.com"):
            db.session.delete(candidate)
    db.session.commit()


def _ensure_candidate(email: str, name: str, password: str, role: str = "candidate") -> None:
    candidate = db.session.query(Candidate).filter_by(email=email.lower()).first()
    if candidate:
        candidate.name = name
        candidate.role = role
        candidate.password_hash = generate_password_hash(password)
        return
    db.session.add(
        Candidate(
            name=name,
            email=email.lower(),
            password_hash=generate_password_hash(password),
            role=role,
            photo_path=None,
        )
    )


def seed_data():
    print("Database connected.")
    print("Checking existing data...")

    app = create_app()
    with app.app_context():
        db.create_all()
        try:
            from sqlalchemy import text
            db.session.execute(text("ALTER TABLE candidates ADD COLUMN role VARCHAR(50) DEFAULT 'candidate'"))
            db.session.commit()
            print("Added role column to candidates table.")
        except Exception:
            db.session.rollback()

        _prune_fake_candidates()

        admin = db.session.query(Candidate).filter_by(email="admin@gmail.com").first()
        if not admin:
            db.session.add(
                Candidate(
                    name="System Administrator",
                    email="admin@gmail.com",
                    password_hash=generate_password_hash("admin@123"),
                    role="admin",
                    photo_path="/tmp/admin.jpg",
                )
            )
        else:
            admin.name = "System Administrator"
            admin.role = "admin"
            admin.password_hash = generate_password_hash("admin@123")

        for email, payload in REAL_CANDIDATE_SEEDS.items():
            _ensure_candidate(email, payload["name"], payload["password"], "candidate")

        db.session.commit()
        print("Demo candidates removed and real candidates ensured.")

        if not db.session.query(Exam).first():
            exams = [
                Exam(title="Mathematics Fundamentals", description="Basic mathematics exam", duration=60, total_marks=100),
                Exam(title="Python Programming", description="Python basics and logic", duration=90, total_marks=120),
                Exam(title="Data Structures", description="Core data structures exam", duration=75, total_marks=110),
            ]
            db.session.add_all(exams)
            db.session.commit()
            print("Creating sample exams...")
        else:
            print("Exams already exist. Skipping...")

        exams = db.session.query(Exam).all()
        additional_exam_payloads = [
            ("Web Development Fundamentals", "HTML, CSS, and JavaScript assessment"),
            ("Cloud Computing Essentials", "Core cloud concepts and services assessment"),
        ]
        for title, description in additional_exam_payloads:
            if not db.session.query(Exam).filter_by(title=title).first():
                exam = Exam(title=title, description=description, duration=45, total_marks=100)
                db.session.add(exam)
                db.session.flush()
                for question_number in range(1, 11):
                    db.session.add(
                        Question(
                            exam_id=exam.id,
                            question_text=f"{title} question {question_number}?",
                            option_a="Option A",
                            option_b="Option B",
                            option_c="Option C",
                            option_d="Option D",
                            correct_option="A",
                        )
                    )
        db.session.commit()
        exams = db.session.query(Exam).order_by(Exam.id).all()
        question_banks = {
            "Mathematics Fundamentals": [
                ("What is 2 + 2?", "3", "4", "5", "6", "B"),
                ("What is 10 - 3?", "7", "6", "8", "5", "A"),
                ("What is 3 x 4?", "9", "10", "12", "14", "C"),
                ("What is half of 50?", "20", "25", "30", "35", "B"),
                ("Which number is prime?", "21", "27", "29", "33", "C"),
                ("What is 8 squared?", "16", "32", "64", "80", "C"),
                ("What is 100 divided by 4?", "20", "25", "40", "50", "B"),
                ("How many degrees are in a right angle?", "45", "90", "180", "360", "B"),
                ("What is 15 percent of 200?", "15", "20", "30", "35", "C"),
                ("What is the next number: 2, 4, 6, 8?", "9", "10", "11", "12", "B"),
            ],
            "Python Programming": [
                ("What keyword defines a function in Python?", "func", "def", "function", "define", "B"),
                ("Which type stores an ordered mutable collection?", "tuple", "list", "set", "dict", "B"),
                ("What does len('Exam') return?", "3", "4", "5", "Error", "B"),
                ("Which symbol starts a comment?", "//", "<!--", "#", "--", "C"),
                ("What value represents no value in Python?", "null", "void", "None", "empty", "C"),
                ("Which method adds an item to a list?", "push", "append", "inserted", "add", "B"),
                ("What does int('7') produce?", "A string", "A float", "An integer", "A boolean", "C"),
                ("Which loop iterates over a sequence?", "for", "switch", "repeat", "iterate", "A"),
                ("What brackets create a dictionary?", "[]", "()", "{}", "<>", "C"),
                ("Which keyword handles an exception?", "catch", "except", "error", "handle", "B"),
            ],
            "Data Structures": [
                ("Which structure follows first-in, first-out order?", "Stack", "Queue", "Tree", "Graph", "B"),
                ("Which structure follows last-in, first-out order?", "Queue", "Stack", "Heap", "Array", "B"),
                ("What is the root of a tree?", "Its deepest node", "Its top node", "Its leaf node", "Its edge", "B"),
                ("Which structure uses key-value pairs?", "Array", "Stack", "Dictionary", "Queue", "C"),
                ("What is a node with no children called?", "Root", "Parent", "Leaf", "Branch", "C"),
                ("Which operation adds an item to a queue?", "Pop", "Enqueue", "Peek", "Delete", "B"),
                ("Which search works on sorted data by halving the range?", "Linear search", "Binary search", "Depth search", "Hash search", "B"),
                ("What does a linked list node usually contain?", "Only a value", "A value and a link", "Only an index", "A key only", "B"),
                ("Which structure is best for priority removal?", "Heap", "Array", "Stack", "Set", "A"),
                ("What is the average lookup time of a hash table?", "O(n^2)", "O(n)", "O(1)", "O(log n)", "C"),
            ],
            "Web Development Fundamentals": [
                ("Which language structures a web page?", "CSS", "HTML", "SQL", "Python", "B"),
                ("Which language styles a web page?", "HTML", "CSS", "JSON", " Bash", "B"),
                ("Which language adds browser interactivity?", "JavaScript", "SQL", "XML", "Markdown", "A"),
                ("Which HTML element creates a hyperlink?", "<link>", "<a>", "<href>", "<url>", "B"),
                ("Which CSS property changes text color?", "font-style", "background", "color", "text", "C"),
                ("What does HTTP status 404 mean?", "Success", "Unauthorized", "Not found", "Server started", "C"),
                ("Which format is commonly used for API data?", "JPEG", "JSON", "MP3", "PNG", "B"),
                ("What does responsive design adapt to?", "Screen size", "Database size", "Password length", "File type", "A"),
                ("Which tag is used for the main heading?", "<h1>", "<head>", "<title>", "<header>", "A"),
                ("Which tool inspects a page in most browsers?", "Developer Tools", "Task Manager", "File Explorer", "Control Panel", "A"),
            ],
            "Cloud Computing Essentials": [
                ("What does cloud computing provide?", "Local-only storage", "On-demand computing resources", "Paper records", "Offline cables", "B"),
                ("Which model provides virtual machines?", "IaaS", "SaaS", "DNS", "HTML", "A"),
                ("Which model provides finished applications?", "IaaS", "PaaS", "SaaS", "LAN", "C"),
                ("What is scalable in cloud systems?", "The ability to adjust resources", "The color of a server", "A fixed password", "A file extension", "A"),
                ("What does backup protect against?", "Data loss", "Faster typing", "Screen glare", "Code indentation", "A"),
                ("Which service distributes traffic across servers?", "Load balancer", "Text editor", "Compiler", "Firewall rule", "A"),
                ("What is multi-factor authentication used for?", "Access security", "Image compression", "Data sorting", "CPU cooling", "A"),
                ("What does encryption protect?", "Data confidentiality", "Screen resolution", "Network speed", "File naming", "A"),
                ("Which design uses multiple availability zones?", "High availability", "Single point failure", "Manual storage", "Local printing", "A"),
                ("What is serverless computing?", "Managed server infrastructure", "No computers at all", "A local spreadsheet", "A disconnected network", "A"),
            ],
        }
        for exam in exams[:5]:
            if not 30 <= exam.duration <= 45:
                exam.duration = 45
            question_count = db.session.query(Question).filter_by(exam_id=exam.id).count()
            for question_number in range(question_count + 1, 11):
                db.session.add(
                    Question(
                        exam_id=exam.id,
                        question_text=f"{exam.title} question {question_number}?",
                        option_a="Option A",
                        option_b="Option B",
                        option_c="Option C",
                        option_d="Option D",
                        correct_option="A",
                    )
                )
            questions_for_exam = db.session.query(Question).filter_by(exam_id=exam.id).order_by(Question.id).all()
            for question, values in zip(questions_for_exam, question_banks.get(exam.title, [])):
                question.question_text, question.option_a, question.option_b, question.option_c, question.option_d, question.correct_option = values
        db.session.commit()
        admin = db.session.query(Candidate).filter_by(email="admin@gmail.com").first()
        candidates = db.session.query(Candidate).filter(Candidate.role != "admin").all()
        if admin:
            for exam_index, exam in enumerate(exams[:5]):
                for candidate in candidates:
                    assignment = db.session.query(ExamAssignment).filter_by(
                        exam_id=exam.id, candidate_id=candidate.id
                    ).first()
                    if not assignment:
                        db.session.add(
                            ExamAssignment(
                                exam_id=exam.id,
                                candidate_id=candidate.id,
                                assigned_by=admin.id,
                                status="available" if exam_index < 3 else "assigned",
                            )
                        )
                    elif exam_index < 3 and assignment.status in {"assigned", "completed"}:
                        assignment.status = "available"
            db.session.commit()

        if not db.session.query(Question).first():
            print("Creating questions...")
            questions = []
            question_sets = [
                (
                    exams[0].id,
                    [
                        ("What is 2 + 2?", "3", "4", "5", "6", "B"),
                        ("What is 10 - 3?", "7", "6", "8", "5", "A"),
                        ("What is 3 x 4?", "9", "10", "12", "14", "C"),
                    ],
                ),
                (
                    exams[1].id,
                    [
                        ("What does Python use for indentation?", "Braces", "Tabs", "Spaces", "Semicolons", "C"),
                        ("Which keyword defines a function?", "class", "def", "loop", "if", "B"),
                        ("What is the output of type(3)?", "int", "str", "float", "bool", "A"),
                    ],
                ),
                (
                    exams[2].id,
                    [
                        ("Which is a linear data structure?", "Queue", "Tree", "Graph", "Set", "A"),
                        ("Which operation removes the last element of a stack?", "push", "pop", "peek", "enqueue", "B"),
                        ("What is a linked list?", "Array", "Dynamic chain", "Hash map", "Tuple", "B"),
                    ],
                ),
            ]

            for exam_id, question_group in question_sets:
                for text, a, b, c, d, correct in question_group:
                    questions.append(
                        Question(
                            exam_id=exam_id,
                            question_text=text,
                            option_a=a,
                            option_b=b,
                            option_c=c,
                            option_d=d,
                            correct_option=correct,
                        )
                    )

            db.session.add_all(questions)
            db.session.commit()
        else:
            print("Questions already exist. Skipping...")

        print("Done.")


if __name__ == "__main__":
    seed_data()
