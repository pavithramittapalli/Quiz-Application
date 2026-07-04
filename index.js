// FIX: API_URL now falls back sensibly instead of being hardcoded only to
// localhost. Update this if you deploy the backend elsewhere.
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : '';

const screens = document.querySelectorAll('.screen');

const mockQuestions = {
    'Reasoning': [
        { question: "Which number should come next: 1, 2, 4, 8, ...?", options: ["16", "12", "10", "14"], answer: "16" },
        { question: "If 'CAT' is '3120', what is 'DOG'?", options: ["4157", "4158", "4156", "4155"], answer: "4157" },
    ],
    'Quantitative Aptitude': [
        { question: "What is 25% of 200?", options: ["25", "50", "75", "100"], answer: "50" }
    ],
    'Relations': [
        { question: "A woman says, 'His mother is the only daughter of my mother.' How is she related to the man?", options: ["Mother", "Sister", "Aunt"], answer: "Mother" }
    ],
    'General Knowledge': [
        { question: "What is the capital of Japan?", options: ["Beijing", "Seoul", "Tokyo", "Bangkok"], answer: "Tokyo" }
    ],
    // FIX: History previously had zero questions, so the category button
    // silently failed with a toast. Added real questions.
    'History': [
        { question: "In what year did World War II end?", options: ["1943", "1945", "1947", "1950"], answer: "1945" },
        { question: "Who was the first President of the United States?", options: ["Thomas Jefferson", "George Washington", "John Adams", "James Madison"], answer: "George Washington" },
        { question: "The ancient city of Rome was built on how many hills?", options: ["5", "6", "7", "8"], answer: "7" }
    ]
};

let currentUser = null, currentQuestionIndex = 0, score = 0, timer, timeLeft = 15;

// FIX: helper to safely escape text before inserting into innerHTML, so a
// user's name or a quiz option can't inject markup/scripts (XSS).
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
}

function showMessage(message, isError = true) {
    const el = document.getElementById('message-box');
    el.textContent = message;
    el.style.backgroundColor = isError ? '#E8735A' : '#6FBFB0';
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}

function showScreen(screenId) {
    screens.forEach(s => s.classList.toggle('active', s.id === screenId));
}

async function handleSignup() {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (!name || !email || !password) {
        return showMessage("Please fill in every field.");
    }
    if (password.length < 6) {
        return showMessage("Password must be at least 6 characters.");
    }

    try {
        const res = await fetch(`${API_URL}/api/signup`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Signup failed');
        currentUser = data;
        document.getElementById('welcome-message').innerText = `Welcome, ${currentUser.name}!`;
        showScreen('category-screen');
    } catch (err) { showMessage(err.message); }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        return showMessage("Please enter your email and password.");
    }

    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed');
        currentUser = data;
        document.getElementById('welcome-message').innerText = `Welcome back, ${currentUser.name}!`;
        showScreen('category-screen');
    } catch (err) { showMessage(err.message); }
}

function logout() {
    currentUser = null;
    showScreen('login-screen');
}

function startQuiz(category) {
    const questions = mockQuestions[category];
    if (!questions || questions.length === 0) return showMessage("No questions for this category yet.");
    window.quizData = questions;
    currentQuestionIndex = score = 0;
    document.getElementById('score').innerText = score;
    document.getElementById('quiz-category').innerText = category;
    document.getElementById('total-questions').innerText = questions.length;
    showScreen('quiz-screen');
    loadQuestion();
}

function loadQuestion() {
    if (currentQuestionIndex >= window.quizData.length) return endQuiz();
    const q = window.quizData[currentQuestionIndex];
    document.getElementById('current-question').innerText = currentQuestionIndex + 1;
    document.getElementById('question-text').innerText = q.question;
    const opts = document.getElementById('options-container');
    // FIX: option text is escaped before insertion, and the answer is looked
    // up via a data attribute instead of being embedded raw in an inline
    // onclick string (which broke on quotes and was an injection risk).
    opts.innerHTML = q.options.map((o, i) =>
        `<button class="w-full p-4 chalk-btn chalk-btn-option font-medium rounded-xl" data-option-index="${i}">${escapeHtml(o)}</button>`
    ).join('');
    opts.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => selectAnswer(btn, q.options[Number(btn.dataset.optionIndex)]));
    });
    resetTimer();
}

function selectAnswer(btn, selected) {
    clearInterval(timer);
    const buttons = document.querySelectorAll('#options-container button');
    buttons.forEach(b => b.disabled = true);
    const correct = window.quizData[currentQuestionIndex].answer;
    if (selected === correct) {
        score += 10;
        document.getElementById('score').innerText = score;
        btn.classList.add('is-correct');
    } else {
        btn.classList.add('is-wrong');
        buttons.forEach(b => {
            if (b.textContent === correct) b.classList.add('is-correct');
        });
    }
    setTimeout(() => { currentQuestionIndex++; loadQuestion(); }, 1500);
}

function resetTimer() {
    timeLeft = 15;
    const bar = document.getElementById('timer-bar');
    bar.classList.remove('is-low');
    bar.style.transition = 'none';
    bar.style.width = '100%';
    setTimeout(() => bar.style.transition = 'width 1s linear', 50);
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        bar.style.width = `${(timeLeft / 15) * 100}%`;
        if (timeLeft <= 5) bar.classList.add('is-low');
        if (timeLeft <= 0) {
            clearInterval(timer);
            // FIX: previously running out of time skipped straight to the
            // next question with no feedback. Now it reveals the correct
            // answer first, same as a wrong-answer selection.
            const buttons = document.querySelectorAll('#options-container button');
            const correct = window.quizData[currentQuestionIndex].answer;
            buttons.forEach(b => {
                b.disabled = true;
                if (b.textContent === correct) b.classList.add('is-correct');
            });
            setTimeout(() => { currentQuestionIndex++; loadQuestion(); }, 1200);
        }
    }, 1000);
}

async function endQuiz() {
    if (currentUser) {
        try {
            await fetch(`${API_URL}/api/score`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentUser.email, score })
            });
        } catch (err) { showMessage("Couldn't save your score — check your connection."); }
    }
    document.getElementById('final-score').innerText = score;
    document.getElementById('final-score-container').style.display = 'block';
    document.getElementById('leaderboard-title').innerText = 'Quiz complete!';
    document.getElementById('leaderboard-buttons').querySelector('button[onclick*="category-screen"]').style.display = 'block';
    await populateLeaderboard();
    showScreen('leaderboard-screen');
}

async function showDashboard() {
    document.getElementById('final-score-container').style.display = 'none';
    document.getElementById('leaderboard-title').innerText = 'Dashboard';
    document.getElementById('leaderboard-buttons').querySelector('button[onclick*="category-screen"]').style.display = currentUser ? 'block' : 'none';
    await populateLeaderboard();
    showScreen('leaderboard-screen');
}

async function populateLeaderboard() {
    try {
        const res = await fetch(`${API_URL}/api/leaderboard`);
        const users = await res.json();
        const list = document.getElementById('leaderboard-list');
        // FIX: names are escaped before insertion into innerHTML to prevent XSS.
        list.innerHTML = users.map((p, i) => {
            const isYou = currentUser && p.email === currentUser.email;
            return `<div class="flex justify-between items-center p-3 rounded-xl" style="${isYou ? 'background: rgba(244,201,93,0.12);' : ''}">
                <div class="flex items-center">
                    <span class="font-bold w-8 font-mono" style="color: var(--chalk-muted);">${i + 1}.</span>
                    <span class="${isYou ? 'font-bold' : ''}" style="${isYou ? 'color: var(--chalk-yellow);' : ''}">${escapeHtml(p.name)} ${isYou ? '(You)' : ''}</span>
                </div>
                <span class="font-bold font-mono" style="${isYou ? 'color: var(--chalk-yellow);' : 'color: var(--chalk-muted);'}">${escapeHtml(p.score)}</span>
            </div>`;
        }).join('');
    } catch (err) { showMessage("Could not load leaderboard."); }
}

showScreen('landing-screen');
