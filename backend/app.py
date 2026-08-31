from backend import create_app
from backend.database import init_db

app = create_app()


if __name__ == "__main__":
    init_db(app)
    app.run(host="0.0.0.0", port=5000, debug=True)
