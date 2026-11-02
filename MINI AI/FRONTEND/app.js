
const input = document.getElementById("user-input");
const messages = document.getElementById("chat-messages");
const welcome = document.getElementById("welcome");

// =====================================
// MINI AI PRO - CHAT HISTORY SYSTEM
// =====================================

const STORAGE_KEY = "miniAI_chatHistory";
const ACTIVE_KEY = "miniAI_activeChat";

let chatHistory = JSON.parse(
    localStorage.getItem(STORAGE_KEY) || "[]"
);

let activeChatId = localStorage.getItem(ACTIVE_KEY);

function createChat() {
    const chat = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        title: "New Chat",
        messages: [],
        updatedAt: Date.now()
    };

    chatHistory.push(chat);
    activeChatId = chat.id;

    saveHistory();

    return chat;
}

function getActiveChat() {
    return chatHistory.find(chat => chat.id === activeChatId);
}

function saveHistory() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(chatHistory)
    );

    localStorage.setItem(ACTIVE_KEY, activeChatId || "");

    renderHistory();
}

// =====================================
// CONNECT MINI AI WITH C BACKEND
// =====================================

async function getAIResponse(message) {
    try {
        const response = await fetch("http://localhost:8080/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message
            })
        });

        if (!response.ok) {
            throw new Error("Server error");
        }

        const data = await response.json();
        return data.reply;

    } catch (error) {
        console.error("Connection Error:", error);

        return "Unable to connect to MINI AI server. Please check your backend.";
    }
}

// =====================================
// SEND MESSAGE
// =====================================

async function sendMessage() {
    const text = input.value.trim();

    if (text === "") return;

    let chat = getActiveChat();

    if (!chat) {
        chat = createChat();
    }

    welcome.style.display = "none";

    chat.messages.push({
        role: "user",
        text: text
    });

    if (chat.title === "New Chat") {
        chat.title = text.length > 30
            ? text.substring(0, 30) + "..."
            : text;
    }

    chat.updatedAt = Date.now();

    addMessage(text, "user-message");

    input.value = "";

    saveHistory();

    const loading = addMessage(
        "MINI AI is thinking...",
        "ai-message"
    );

    const answer = await getAIResponse(text);

    loading.textContent = answer;

    chat.messages.push({
        role: "ai",
        text: answer
    });

    chat.updatedAt = Date.now();

    saveHistory();
}

// =====================================
// DISPLAY MESSAGE
// =====================================

function addMessage(text, className) {
    const div = document.createElement("div");

    div.className = "message " + className;
    div.textContent = text;

    messages.appendChild(div);

    messages.scrollTop = messages.scrollHeight;

    return div;
}

// =====================================
// SUGGESTION BUTTONS
// =====================================

function suggest(text) {
    input.value = text;
    sendMessage();
}

// =====================================
// NEW CHAT
// =====================================

function newChat() {
    createChat();

    messages.innerHTML = "";

    welcome.style.display = "block";

    input.value = "";

    showPage("chat");
}

// =====================================
// OPEN PREVIOUS CHAT
// =====================================

function openChat(id) {
    const chat = chatHistory.find(item => item.id === id);

    if (!chat) return;

    activeChatId = id;

    localStorage.setItem(ACTIVE_KEY, id);

    messages.innerHTML = "";

    if (chat.messages.length === 0) {
        welcome.style.display = "block";
    } else {
        welcome.style.display = "none";

        chat.messages.forEach(message => {
            const className = message.role === "user"
                ? "user-message"
                : "ai-message";

            addMessage(message.text, className);
        });
    }

    showPage("chat");

    renderHistory();
}

// =====================================
// DISPLAY CHAT HISTORY
// =====================================

function renderHistory() {
    const historyList = document.getElementById("history-list");

    if (!historyList) return;

    historyList.innerHTML = "";

    const savedChats = [...chatHistory]
        .filter(chat => chat.messages.length > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt);

    if (savedChats.length === 0) {
        historyList.textContent = "No chat history available yet.";
        return;
    }

    savedChats.forEach(chat => {
        const item = document.createElement("div");

        item.className = "history-item";

        const openButton = document.createElement("button");

        openButton.className = "history-open";
        openButton.textContent = "💬 " + chat.title;

        openButton.onclick = () => openChat(chat.id);

        const deleteButton = document.createElement("button");

        deleteButton.className = "history-delete";
        deleteButton.textContent = "🗑 Delete";

        deleteButton.onclick = () => deleteChat(chat.id);

        item.appendChild(openButton);
        item.appendChild(deleteButton);

        historyList.appendChild(item);
    });
}

// =====================================
// DELETE INDIVIDUAL CHAT
// =====================================

function deleteChat(id) {
    chatHistory = chatHistory.filter(chat => chat.id !== id);

    if (activeChatId === id) {
        activeChatId = "";

        messages.innerHTML = "";

        welcome.style.display = "block";

        createChat();
    }

    saveHistory();
}

// =====================================
// DELETE ALL HISTORY
// =====================================

function clearAllHistory() {
    if (!confirm("Are you sure you want to delete all chat history?")) {
        return;
    }

    chatHistory = [];

    activeChatId = "";

    messages.innerHTML = "";

    welcome.style.display = "block";

    createChat();

    renderHistory();
}

// =====================================
// PAGE NAVIGATION
// =====================================

function showPage(page) {
    const pages = [
        "chat",
        "knowledge",
        "calculator",
        "history"
    ];

    pages.forEach(name => {
        const section = document.getElementById(name + "-page");

        if (section) {
            section.classList.toggle("hidden", name !== page);
        }
    });

    const titles = {
        chat: "AI Chat",
        knowledge: "Knowledge Base",
        calculator: "Calculator",
        history: "Chat History"
    };

    const pageTitle = document.getElementById("page-title");

    if (pageTitle) {
        pageTitle.textContent = titles[page] || "MINI AI PRO";
    }

    document.querySelectorAll(".menu-item").forEach(button => {
        button.classList.remove("active");
    });

    const selected = {
        chat: 0,
        knowledge: 1,
        calculator: 2,
        history: 3
    };

    const menuItems = document.querySelectorAll(".menu-item");

    if (selected[page] !== undefined && menuItems[selected[page]]) {
        menuItems[selected[page]].classList.add("active");
    }

    if (page === "history") {
        renderHistory();
    }
}

// =====================================
// ENTER KEY
// =====================================

input.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});

// =====================================
// ADD NEW KNOWLEDGE
// =====================================

async function addKnowledge() {
    const question = document
        .getElementById("knowledge-question")
        .value.trim();

    const answer = document
        .getElementById("knowledge-answer")
        .value.trim();

    const status = document.getElementById("knowledge-status");

    if (question === "" || answer === "") {
        status.textContent = "Please enter both question and answer!";
        return;
    }

    try {
        const response = await fetch(
            "http://localhost:8080/add-knowledge",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    question: question,
                    answer: answer
                })
            }
        );

        const data = await response.json();

        if (response.ok) {
            status.textContent = "Knowledge saved successfully!";

            document.getElementById("knowledge-question").value = "";
            document.getElementById("knowledge-answer").value = "";

        } else {
            status.textContent =
                data.reply || "Could not save knowledge.";
        }

    } catch (error) {
        status.textContent =
            "Server connection failed. Please start the C server.";
    }
}

// =====================================
// LOAD PREVIOUS CHAT AFTER REFRESH
// =====================================

function initializeChatHistory() {
    let chat = getActiveChat();

    if (!chat) {
        if (chatHistory.length > 0) {
            chat = [...chatHistory].sort(
                (a, b) => b.updatedAt - a.updatedAt
            )[0];

            activeChatId = chat.id;

        } else {
            chat = createChat();
        }
    }

    localStorage.setItem(ACTIVE_KEY, activeChatId);

    messages.innerHTML = "";

    if (chat.messages.length === 0) {
        welcome.style.display = "block";

    } else {
        welcome.style.display = "none";

        chat.messages.forEach(message => {
            addMessage(
                message.text,
                message.role === "user"
                    ? "user-message"
                    : "ai-message"
            );
        });
    }

    renderHistory();
}

// =====================================
// SCIENTIFIC CALCULATOR
// =====================================

const calcDisplay = document.getElementById("calc-display");
const calcStatus = document.getElementById("calc-status");
const angleButton = document.getElementById("angle-mode");

let calcAngleMode = "DEG";
let calcLastAnswer = 0;
let calcJustCalculated = false;

function calcUpdateStatus(message) {
    if (calcStatus) {
        calcStatus.textContent = message;
    }
}

function calcPress(value) {
    if (!calcDisplay) return;

    const startsNew = (
        /^[0-9.]$/.test(value) ||
        value === "pi" ||
        value === "e" ||
        value === "Ans" ||
        value.endsWith("(")
    );

    if (calcJustCalculated && startsNew) {
        calcDisplay.value = "";
    }

    calcJustCalculated = false;

    calcDisplay.value += value;

    calcUpdateStatus("Entering expression...");
}

function calcClear() {
    if (!calcDisplay) return;

    calcDisplay.value = "";

    calcJustCalculated = false;

    calcUpdateStatus("Ready to calculate");
}

function calcDelete() {
    if (!calcDisplay) return;

    calcDisplay.value = calcDisplay.value.slice(0, -1);

    calcJustCalculated = false;

    calcUpdateStatus("Last character deleted");
}

function calcToggleAngle() {
    calcAngleMode = calcAngleMode === "DEG" ? "RAD" : "DEG";

    if (angleButton) {
        angleButton.textContent = calcAngleMode;
    }

    calcUpdateStatus("Angle mode: " + calcAngleMode);
}

// =====================================
// MATHEMATICAL EXPRESSION PARSER
// =====================================

function calculateExpression(expression) {

    const tokens = expression.match(
        /(?:\d+\.?\d*|\.\d+)|(?:[a-zA-Z]+)|[+\-*/^()%!]/g
    );

    if (!tokens || tokens.join("") !== expression.replace(/\s/g, "")) {
        throw new Error("Invalid expression");
    }

    let position = 0;

    function peek() {
        return tokens[position];
    }

    function consume() {
        return tokens[position++];
    }

    function parseExpression() {
        let value = parseTerm();

        while (peek() === "+" || peek() === "-") {
            const operator = consume();
            const right = parseTerm();

            value = operator === "+"
                ? value + right
                : value - right;
        }

        return value;
    }

    function parseTerm() {
        let value = parseUnary();

        while (peek() === "*" || peek() === "/") {
            const operator = consume();
            const right = parseUnary();

            if (operator === "*") {
                value *= right;
            } else {
                if (right === 0) {
                    throw new Error("Cannot divide by zero");
                }

                value /= right;
            }
        }

        return value;
    }

    function parseUnary() {
        if (peek() === "+") {
            consume();
            return parseUnary();
        }

        if (peek() === "-") {
            consume();
            return -parseUnary();
        }

        return parsePower();
    }

    function parsePower() {
        let value = parsePostfix();

        if (peek() === "^") {
            consume();

            const exponent = parseUnary();

            value = Math.pow(value, exponent);
        }

        return value;
    }

    function parsePostfix() {
        let value = parsePrimary();

        while (peek() === "!" || peek() === "%") {
            const operator = consume();

            if (operator === "!") {
                if (!Number.isInteger(value) || value < 0 || value > 170) {
                    throw new Error("Factorial needs an integer from 0 to 170");
                }

                let result = 1;

                for (let i = 2; i <= value; i++) {
                    result *= i;
                }

                value = result;

            } else {
                value = value / 100;
            }
        }

        return value;
    }

    function parsePrimary() {
        const token = consume();

        if (token === undefined) {
            throw new Error("Incomplete expression");
        }

        if (token === "(") {
            const value = parseExpression();

            if (consume() !== ")") {
                throw new Error("Missing closing bracket");
            }

            return value;
        }

        if (!isNaN(Number(token))) {
            return Number(token);
        }

        if (token === "pi") {
            return Math.PI;
        }

        if (token === "e") {
            return Math.E;
        }

        if (token === "Ans") {
            return calcLastAnswer;
        }

        const functions = ["sin", "cos", "tan", "log", "ln", "sqrt"];

        if (functions.includes(token)) {
            if (consume() !== "(") {
                throw new Error("Function needs parentheses");
            }

            const value = parseExpression();

            if (consume() !== ")") {
                throw new Error("Missing closing bracket");
            }

            switch (token) {
                case "sin":
                    return Math.sin(
                        calcAngleMode === "DEG"
                            ? value * Math.PI / 180
                            : value
                    );

                case "cos":
                    return Math.cos(
                        calcAngleMode === "DEG"
                            ? value * Math.PI / 180
                            : value
                    );

                case "tan": {
                    const angle = calcAngleMode === "DEG"
                        ? value * Math.PI / 180
                        : value;

                    if (Math.abs(Math.cos(angle)) < 1e-12) {
                        throw new Error("Tangent is undefined at this angle");
                    }

                    return Math.tan(angle);
                }

                case "log":
                    if (value <= 0) {
                        throw new Error("Log requires a positive number");
                    }
                    return Math.log10(value);

                case "ln":
                    if (value <= 0) {
                        throw new Error("Ln requires a positive number");
                    }
                    return Math.log(value);

                case "sqrt":
                    if (value < 0) {
                        throw new Error("Cannot calculate square root of a negative number");
                    }
                    return Math.sqrt(value);
            }
        }

        throw new Error("Unknown value: " + token);
    }

    const result = parseExpression();

    if (position !== tokens.length) {
        throw new Error("Invalid expression");
    }

    if (!Number.isFinite(result)) {
        throw new Error("Result is outside the supported range");
    }

    return result;
}

// =====================================
// CALCULATE RESULT
// =====================================

function calcCalculate() {
    if (!calcDisplay) return;

    const expression = calcDisplay.value.trim();

    if (expression === "") {
        calcUpdateStatus("Enter a calculation first");
        return;
    }

    try {
        const result = calculateExpression(expression);

        calcLastAnswer = result;

        const formattedResult = Number(
            result.toPrecision(12)
        ).toString();

        calcDisplay.value = formattedResult;

        calcJustCalculated = true;

        calcUpdateStatus("Calculation successful");

    } catch (error) {
        calcUpdateStatus("Error: " + error.message);

        calcJustCalculated = false;
    }
}

// =====================================
// START MINI AI
// =====================================

initializeChatHistory();
