export const mockExams = [
  {
    id: 1,
    name: "Python Programming Test",
    duration: 30,
    totalQuestions: 10,
    difficulty: "Intermediate",
    description: "Test your Python programming skills",
    backgroundColor: "bg-primary-container",
    status: "available"
  },
  {
    id: 2,
    name: "Artificial Intelligence Basics",
    duration: 45,
    totalQuestions: 15,
    difficulty: "Advanced",
    description: "Explore fundamental concepts of AI",
    backgroundColor: "bg-secondary",
    status: "assigned"
  },
  {
    id: 3,
    name: "Data Structures Intro",
    duration: 30,
    totalQuestions: 10,
    difficulty: "Beginner",
    description: "Master basic data structures",
    backgroundColor: "bg-tertiary-container",
    status: "available"
  },
  {
    id: 4,
    name: "Web Development Fundamentals",
    duration: 40,
    totalQuestions: 12,
    difficulty: "Beginner",
    description: "HTML, CSS, and JavaScript basics",
    backgroundColor: "bg-primary-container",
    status: "assigned"
  },
  {
    id: 5,
    name: "Advanced Database Design",
    duration: 45,
    totalQuestions: 20,
    difficulty: "Advanced",
    description: "Complex database architectures",
    backgroundColor: "bg-secondary",
    status: "available"
  },
];

export const mockQuestions = [
  {
    id: 1,
    text: "What is the correct way to define a function in Python?",
    options: [
      "function myFunc() { }",
      "def myFunc():",
      "define myFunc():",
      "func myFunc() { }"
    ],
    correctAnswer: 1,
    explanation: "In Python, functions are defined using the 'def' keyword followed by the function name and parameters."
  },
  {
    id: 2,
    text: "Which data structure uses LIFO (Last In First Out) principle?",
    options: [
      "Queue",
      "Stack",
      "List",
      "Graph"
    ],
    correctAnswer: 1,
    explanation: "A Stack follows LIFO principle where the last element added is the first one to be removed."
  },
  {
    id: 3,
    text: "What is the time complexity of binary search?",
    options: [
      "O(n)",
      "O(log n)",
      "O(n²)",
      "O(1)"
    ],
    correctAnswer: 1,
    explanation: "Binary search has a time complexity of O(log n) because it divides the search space in half with each iteration."
  },
  {
    id: 4,
    text: "Which sorting algorithm has the worst-case time complexity of O(n²)?",
    options: [
      "Merge Sort",
      "Quick Sort",
      "Bubble Sort",
      "Heap Sort"
    ],
    correctAnswer: 2,
    explanation: "Bubble Sort has a worst-case time complexity of O(n²) when the array is in reverse order."
  },
  {
    id: 5,
    text: "What is the purpose of a hash table?",
    options: [
      "To sort data efficiently",
      "To store key-value pairs with fast lookup",
      "To implement stack operations",
      "To traverse trees"
    ],
    correctAnswer: 1,
    explanation: "A hash table stores key-value pairs and provides average O(1) time complexity for lookups, insertions, and deletions."
  },
  {
    id: 6,
    text: "Which of the following is NOT an advantage of OOP?",
    options: [
      "Code reusability",
      "Faster execution speed",
      "Better organization",
      "Encapsulation"
    ],
    correctAnswer: 1,
    explanation: "While OOP has many advantages like reusability and encapsulation, faster execution speed is not typically one of them."
  },
  {
    id: 7,
    text: "What does REST stand for?",
    options: [
      "Representational State Transfer",
      "Remote Essential Service Technology",
      "Resource Efficient Storage Table",
      "Real-time Event Service Table"
    ],
    correctAnswer: 0,
    explanation: "REST stands for Representational State Transfer, a architectural style for designing networked applications."
  },
  {
    id: 8,
    text: "Which HTTP method is used to update a resource?",
    options: [
      "GET",
      "POST",
      "PUT",
      "DELETE"
    ],
    correctAnswer: 2,
    explanation: "PUT is used to update an existing resource completely, while PATCH can be used for partial updates."
  },
  {
    id: 9,
    text: "What is the purpose of middleware in web applications?",
    options: [
      "To beautify the UI",
      "To handle requests and responses",
      "To store user data",
      "To compress files"
    ],
    correctAnswer: 1,
    explanation: "Middleware processes requests and responses in a web application, handling tasks like authentication and logging."
  },
  {
    id: 10,
    text: "Which of the following is a NoSQL database?",
    options: [
      "PostgreSQL",
      "MongoDB",
      "MySQL",
      "Oracle"
    ],
    correctAnswer: 1,
    explanation: "MongoDB is a popular NoSQL document database, while PostgreSQL, MySQL, and Oracle are relational databases."
  }
];

export function getExamById(id) {
  return mockExams.find((exam) => exam.id === parseInt(id, 10))
}

export function buildExamQuestions(exam) {
  if (!exam) return []

  const count = Math.max(1, exam.totalQuestions || mockQuestions.length)
  const questions = []

  for (let index = 0; index < count; index += 1) {
    const original = mockQuestions[index % mockQuestions.length]
    questions.push({
      ...original,
      id: index + 1,
      text: `${original.text} (${exam.name} Q${index + 1})`,
      explanation: original.explanation,
      options: original.options
    })
  }

  return questions
}

export const mockActivityLog = [
  {
    id: 1,
    title: "Python Programming Test Completed",
    status: "completed",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    score: 85
  },
  {
    id: 2,
    title: "Data Structures Assignment Submitted",
    status: "completed",
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    score: 92
  },
  {
    id: 3,
    title: "Web Development Quiz Started",
    status: "in-progress",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    score: null
  },
  {
    id: 4,
    title: "AI Fundamentals Exam Scheduled",
    status: "scheduled",
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    score: null
  }
];

export const mockUserData = {
  id: "EG-88294",
  name: "Alex Carter",
  email: "alex.carter@institution.edu",
  role: "Candidate",
  avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAFUnlzhjRldr4Q7M4zC9k84ImHloeozMWojawdlJunTMLVvRyitmFmyHaQG7qmtsDiPeNwZUZYytOoAmSLJUKpHE84bWugk4JnPnkk1wMocAEUTabDjXayTuePyqeum05ouaWtQUiFLUgzbH_SrSgnhmSs7ijK6lMCLNI6ZiDQBPLZUPlIh5wm-Q9rGEETmU5iGf7eDlxODS9TdI6lnE-N37rarDnEQ8Gm57HR5azPQnkfVDXLMz4ekNA5IKzBLl1J_LNTaIARjQ1S",
  stats: {
    totalExams: 12,
    completedExams: 45,
    pendingExams: 3,
    averageScore: 85
  }
};

export const EXAM_DURATION_SECONDS = 60 * 60; // 1 hour
export const SAMPLE_EXAM_DURATION = 10 * 60; // 10 minutes for demo

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  EXAM_INSTRUCTIONS: "/exam/:examId/instructions",
  EXAM: "/exam/:examId",
  SESSION_EXPIRED: "/session-expired",
  SYNTHETIC_DATA: "/synthetic-data",
  PROFILE: "/profile",
  SESSION_LOGS: "/session-logs",
  NOT_FOUND: "/not-found"
};
