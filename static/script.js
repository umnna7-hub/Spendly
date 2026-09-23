let allExpenses = [];


function showTab(tabName, button = null) {

    let tabs = document.querySelectorAll(".tab");

    tabs.forEach(function(tab) {
        tab.style.display = "none";
    });

    document.getElementById(tabName).style.display = "block";


    let buttons = document.querySelectorAll(".menu-btn");

    buttons.forEach(function(btn) {
        btn.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    let sidebar = document.querySelector(".sidebar");
    if (sidebar.classList.contains("mobile-open")) {
        toggleMobileMenu();
    }
}


async function loadExpenses() {

    let response = await fetch("/expenses");

    allExpenses = await response.json();

    updateDashboard(allExpenses);
    displayExpenses(allExpenses);
    updateAnalytics(allExpenses);
}


/* ---------------- DASHBOARD ---------------- */

function updateDashboard(expenses) {

    let total = 0;
    let categories = [];

    expenses.forEach(function(expense) {

        total += Number(expense.amount);

        if (!categories.includes(expense.category)) {
            categories.push(expense.category);
        }
    });


    document.getElementById("total-spending").innerText =
        "Rs. " + total.toLocaleString();

    document.getElementById("expense-count").innerText =
        expenses.length;

    document.getElementById("category-count").innerText =
        categories.length;


    let recentContainer =
        document.getElementById("recent-expenses");

    recentContainer.innerHTML = "";


    let recentExpenses = expenses.slice(-5).reverse();


    if (recentExpenses.length === 0) {

        recentContainer.innerHTML =
            `<div class="empty">No expenses yet.</div>`;

        return;
    }


    recentExpenses.forEach(function(expense) {

        let item = document.createElement("div");

        item.className = "recent-item";

        let color = getCategoryColor(expense.category);

        item.innerHTML = `
            <div class="recent-left">

                <div class="category-icon" style="background:${color.bg};color:${color.fg}">
                    ${getCategoryIcon(expense.category)}
                </div>

                <div>
                    <strong>${expense.category}</strong>
                    <small>${expense.description}</small>
                </div>

            </div>

            <div class="recent-amount">
                Rs. ${Number(expense.amount).toLocaleString()}
            </div>
        `;

        recentContainer.appendChild(item);
    });
}


/* ---------------- ALL EXPENSES ---------------- */

function displayExpenses(expenses) {

    let container =
        document.getElementById("expense-list");

    container.innerHTML = "";


    if (expenses.length === 0) {

        container.innerHTML =
            `<div class="empty">No expenses found.</div>`;

        return;
    }


    expenses.slice().reverse().forEach(function(expense) {

        let item = document.createElement("div");

        item.className = "expense-item";

        let color = getCategoryColor(expense.category);

        item.innerHTML = `

            <div class="expense-info">

                <div class="category-icon" style="background:${color.bg};color:${color.fg}">
                    ${getCategoryIcon(expense.category)}
                </div>

                <div>
                    <h3>${expense.category}</h3>
                    <p>${expense.description}</p>
                </div>

            </div>


            <div class="expense-right">

                <span class="expense-amount">
                    Rs. ${Number(expense.amount).toLocaleString()}
                </span>

                <button
                    class="delete-btn"
                    onclick="deleteExpense(${expense.id})">
                    Delete
                </button>

            </div>
        `;

        container.appendChild(item);
    });
}


/* ---------------- ADD EXPENSE ---------------- */

document.getElementById("expense-form").addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        let amount =
            document.getElementById("amount").value;

        let category =
            document.getElementById("category").value;

        let description =
            document.getElementById("description").value;


        let response = await fetch("/expenses", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                amount: amount,
                category: category,
                description: description

            })
        });

if (response.ok) {

    document.getElementById("expense-form").reset();

    await loadExpenses();

    loadBudget();

    showTab("expenses");

} else {

            alert("Something went wrong while adding the expense.");

        }
    }
);


/* ---------------- DELETE ---------------- */

async function deleteExpense(id) {

    let confirmDelete =
        confirm("Are you sure you want to delete this expense?");


    if (!confirmDelete) {
        return;
    }


    let response =
        await fetch("/expenses/" + id, {

            method: "DELETE"

        });


    if (response.ok) {

        await loadExpenses();

    } else {

        alert("Could not delete the expense.");

    }
}


/* ---------------- SEARCH ---------------- */

function searchExpenses() {

    let search =
        document.getElementById("search-input")
        .value
        .toLowerCase();


    let filtered =
        allExpenses.filter(function(expense) {

            return (
                expense.category.toLowerCase().includes(search) ||
                expense.description.toLowerCase().includes(search)
            );

        });


    displayExpenses(filtered);
}


/* ---------------- ANALYTICS ---------------- */

function updateAnalytics(expenses) {

    let averageElement =
        document.getElementById("average-expense");

    let highestElement =
        document.getElementById("highest-expense");

    let topCategoryElement =
        document.getElementById("top-category");


    if (expenses.length === 0) {

        averageElement.innerText = "Rs. 0";
        highestElement.innerText = "Rs. 0";
        topCategoryElement.innerText = "—";

        document.getElementById("category-chart").innerHTML =
            `<div class="empty">Add some expenses to see analytics.</div>`;

        document.getElementById("category-breakdown").innerHTML = "";

        return;
    }


    let total = 0;
    let highest = 0;
    let categoryTotals = {};


    expenses.forEach(function(expense) {

        let amount = Number(expense.amount);

        total += amount;


        if (amount > highest) {
            highest = amount;
        }


        if (!categoryTotals[expense.category]) {
            categoryTotals[expense.category] = 0;
        }

        categoryTotals[expense.category] += amount;

    });


    let average = total / expenses.length;


    let topCategory = Object.keys(categoryTotals).reduce(
        function(previous, current) {

            if (
                categoryTotals[current] >
                categoryTotals[previous]
            ) {
                return current;
            }

            return previous;

        }
    );


    averageElement.innerText =
        "Rs. " + average.toLocaleString(undefined, {
            maximumFractionDigits: 2
        });


    highestElement.innerText =
        "Rs. " + highest.toLocaleString();


    topCategoryElement.innerText =
        topCategory;


    createCategoryChart(categoryTotals);

    createCategoryBreakdown(categoryTotals, total);
}


/* ---------------- CATEGORY CHART ---------------- */

function createCategoryChart(categoryTotals) {

    let container =
        document.getElementById("category-chart");

    container.innerHTML = "";


    let values =
        Object.values(categoryTotals);

    let max =
        Math.max(...values);


    Object.entries(categoryTotals)
        .sort(function(a, b) {
            return b[1] - a[1];
        })
        .forEach(function(entry) {

            let category = entry[0];
            let amount = entry[1];

            let percentage =
                (amount / max) * 100;

            let color =
                getCategoryColor(category);


            let row =
                document.createElement("div");

            row.className = "chart-row";


            row.innerHTML = `

                <div class="chart-label">
                    ${category}
                </div>

                <div class="chart-bar">
                    <div
                        class="chart-fill"
                        style="width: ${percentage}%; background: ${color.fg}">
                    </div>
                </div>

                <div class="chart-value">
                    Rs. ${amount.toLocaleString()}
                </div>

            `;

            container.appendChild(row);
        });
}


/* ---------------- BREAKDOWN ---------------- */

function createCategoryBreakdown(categoryTotals, total) {

    let container =
        document.getElementById("category-breakdown");

    container.innerHTML = "";


    Object.entries(categoryTotals)
        .sort(function(a, b) {
            return b[1] - a[1];
        })
        .forEach(function(entry) {

            let category = entry[0];
            let amount = entry[1];

            let percentage =
                (amount / total) * 100;


            let item =
                document.createElement("div");

            item.className =
                "breakdown-item";


            item.innerHTML = `

                <span>${category}</span>

                <strong>
                    ${percentage.toFixed(1)}%
                </strong>

            `;


            container.appendChild(item);

        });
}


/* ---------------- CATEGORY ICONS ---------------- */

function getCategoryIcon(category) {

    let name =
        category.toLowerCase();


    if (name.includes("food")) {
        return "🍔";
    }

    if (name.includes("transport") ||
        name.includes("travel")) {
        return "🚕";
    }

    if (name.includes("shopping")) {
        return "🛍";
    }

    if (name.includes("bill")) {
        return "🧾";
    }

    if (name.includes("health")) {
        return "💊";
    }

    if (name.includes("education")) {
        return "📚";
    }

    return "💰";
}


/* ---------------- CATEGORY COLORS ---------------- */

function getCategoryColor(category) {

    let name =
        category.toLowerCase();

    if (name.includes("food")) {
        return { bg: "#FBE6D9", fg: "#D8672E" };
    }

    if (name.includes("transport") ||
        name.includes("travel")) {
        return { bg: "#DCE9F5", fg: "#3072AE" };
    }

    if (name.includes("shopping")) {
        return { bg: "#F1DDF0", fg: "#A2489B" };
    }

    if (name.includes("bill")) {
        return { bg: "#E4E9E7", fg: "#5C6B65" };
    }

    if (name.includes("health")) {
        return { bg: "#FBEBE9", fg: "#B4453E" };
    }

    if (name.includes("education")) {
        return { bg: "#E5E3F7", fg: "#5F57B8" };
    }

    return { bg: "#E4EFE8", fg: "#2F8066" };
}
async function saveBudget() {
    const salary = Number(document.getElementById("salary").value);
    const savingsGoal = Number(document.getElementById("savings-goal").value);

    if (!salary || !savingsGoal) {
        alert("Please enter salary and savings goal.");
        return;
    }

    const month = document.getElementById("budget-month").value;

    const response = await fetch("/budget", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            salary: salary,
            savings_goal: savingsGoal,
            month: month
        })
    });

    const data = await response.json();

    if (response.ok) {
        alert("Budget saved!");
        loadBudget();
    } else {
        alert(data.message || "Something went wrong.");
    }
}
async function loadBudget() {
    const month = document.getElementById("budget-month").value;
    if (!month) {
    return;
}

    const response = await fetch(`/budget/status?month=${month}`);

    if (!response.ok) {
        return;
    }

    const data = await response.json();
    document.getElementById("salary").value = data.salary;
document.getElementById("savings-goal").value = data.savings_goal;

    document.getElementById("spending-budget").textContent =
        `Rs. ${data.effective_budget.toLocaleString()}`;

    document.getElementById("budget-spent").textContent =
        `Rs. ${data.total_spent.toLocaleString()}`;

    document.getElementById("budget-remaining").textContent =
        `Rs. ${data.remaining.toLocaleString()}`;

    document.getElementById("budget-percentage").textContent =
        `${data.percentage_used}%`;
    const progress = document.getElementById("budget-progress");
const progressPercentage = document.getElementById("progress-percentage");
if (data.percentage_used >= 100) {
    progress.classList.add("over-budget");
    progress.classList.remove("warning");
}
else if (data.percentage_used >= 80) {
    progress.classList.add("warning");
    progress.classList.remove("over-budget");
}
else {
    progress.classList.remove("warning", "over-budget");
}

progress.style.width = `${Math.min(data.percentage_used, 100)}%`;
progressPercentage.textContent = `${data.percentage_used}%`;

    const statusBox = document.getElementById("budget-status");

    if (data.status === "warning") {
        statusBox.textContent =
            `⚠️ You've used ${data.percentage_used}% of your monthly spending budget.`;
    }
    else if (data.status === "over_budget") {
        statusBox.textContent =
            `🚨 You're Rs. ${data.over_budget.toLocaleString()} over budget.`;
    }
    else {
        statusBox.textContent =
            "You're within your monthly budget. 👍";
    }
}

/* ---------------- START APP ---------------- */

function startApp() {
    document.getElementById("welcome-screen").style.display = "none";
    document.querySelector(".app").style.display = "flex";
}

showTab("dashboard");
loadExpenses();
loadBudget();
document.getElementById("budget-month").addEventListener(
    "change",
    loadBudget
);
function toggleMobileMenu() {

    const sidebar = document.querySelector(".sidebar");
    const icon = document.getElementById("menu-icon");
    const overlay = document.querySelector(".sidebar-overlay");

    sidebar.classList.toggle("mobile-open");
    overlay.classList.toggle("active");

    if (sidebar.classList.contains("mobile-open")) {
        icon.textContent = "✕";
    } else {
        icon.textContent = "☰";
    }
}