from flask import Flask, request, render_template
from db import get_connection
from datetime import date

app = Flask(__name__)



@app.route("/")
def home():
    return render_template("index.html")

@app.route("/expenses", methods=["GET"])
def get_expenses():
    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT * FROM expenses")

    expenses = cursor.fetchall()

    cursor.close()
    connection.close()

    return expenses
@app.route("/expenses/<int:id>", methods=["PUT"])
def update_expense(id):
    data = request.json

    connection = get_connection()
    cursor = connection.cursor()

    query = """
    UPDATE expenses
    SET amount = %s, category = %s, description = %s
    WHERE id = %s
    """

    values = (
        data["amount"],
        data["category"],
        data["description"],
        id
    )

    cursor.execute(query, values)
    connection.commit()

    cursor.close()
    connection.close()

    return {
        "message": "Expense updated"
    }
@app.route("/expenses/<int:id>", methods=["DELETE"])
def delete_expense(id):
    connection = get_connection()
    cursor = connection.cursor()

    query = "DELETE FROM expenses WHERE id = %s"

    cursor.execute(query, (id,))
    connection.commit()

    cursor.close()
    connection.close()

    return {"message": "Expense deleted"}
@app.route("/expenses", methods=["POST"])
def add_expense():
    data = request.json

    connection = get_connection()
    cursor = connection.cursor()

    query = """
    INSERT INTO expenses (amount, category, description, expense_date)
    VALUES (%s, %s, %s, %s)
    """

    values = (
        data["amount"],
        data["category"],
        data["description"],
        date.today()
    )

    cursor.execute(query, values)
    connection.commit()

    new_id = cursor.lastrowid

    cursor.close()
    connection.close()

    return {
        "id": new_id,
        "amount": data["amount"],
        "category": data["category"],
        "description": data["description"],
        "expense_date": str(date.today())
    }
@app.route("/budget", methods=["POST"])
def save_budget():
    data = request.json

    salary = data["salary"]
    savings_goal = data["savings_goal"]
    month = data["month"]

    spending_budget = salary - savings_goal

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    previous_month_query = """
    SELECT month, spending_budget, carry_over
    FROM monthly_budget
    WHERE month < %s
    ORDER BY month DESC
    LIMIT 1
    """

    cursor.execute(previous_month_query, (month,))
    previous_budget = cursor.fetchone()

    carry_over = 0

    if previous_budget:
        previous_month = previous_budget["month"]

        expense_query = """
        SELECT COALESCE(SUM(amount), 0) AS total_spent
        FROM expenses
        WHERE DATE_FORMAT(expense_date, '%Y-%m') = %s
        """

        cursor.execute(expense_query, (previous_month,))
        result = cursor.fetchone()

        total_spent = float(result["total_spent"])
        previous_spending_budget = float(previous_budget["spending_budget"])
        previous_carry_over = float(previous_budget["carry_over"])

        previous_effective_budget = previous_spending_budget - previous_carry_over

        if total_spent > previous_effective_budget:
            carry_over = total_spent - previous_effective_budget

    query = """
    INSERT INTO monthly_budget
    (month, salary, savings_goal, spending_budget, carry_over)
    VALUES (%s, %s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
    salary = %s,
    savings_goal = %s,
    spending_budget = %s
    """

    values = (
        month,
        salary,
        savings_goal,
        spending_budget,
        carry_over,
        salary,
        savings_goal,
        spending_budget
    )

    cursor.execute(query, values)
    connection.commit()

    cursor.close()
    connection.close()

    return {
        "message": "Budget saved",
        "month": month,
        "salary": salary,
        "savings_goal": savings_goal,
        "spending_budget": spending_budget,
        "carry_over": carry_over
    }
@app.route("/budget", methods=["GET"])
def get_budget():
    month = request.args.get("month")

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    query = "SELECT * FROM monthly_budget WHERE month = %s"

    cursor.execute(query, (month,))

    budget = cursor.fetchone()

    cursor.close()
    connection.close()

    return budget
@app.route("/budget/status", methods=["GET"])
def budget_status():
    month = request.args.get("month")

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    budget_query = """
    SELECT * FROM monthly_budget
    WHERE month = %s
    """

    cursor.execute(budget_query, (month,))
    budget = cursor.fetchone()

    if not budget:
        cursor.close()
        connection.close()
        return {"message": "Budget not found"}, 404

    expense_query = """
    SELECT COALESCE(SUM(amount), 0) AS total_spent
    FROM expenses
    WHERE DATE_FORMAT(expense_date, '%Y-%m') = %s
    """

    cursor.execute(expense_query, (month,))
    result = cursor.fetchone()

    total_spent = float(result["total_spent"])
    spending_budget = float(budget["spending_budget"])
    carry_over = float(budget["carry_over"])

    effective_budget = spending_budget - carry_over
    remaining = effective_budget - total_spent

    if effective_budget > 0:
        percentage_used = (total_spent / effective_budget) * 100
    else:
        percentage_used = 100

    if remaining < 0:
        over_budget = abs(remaining)
    else:
        over_budget = 0
    if percentage_used >= 100:
        status = "over_budget"
    elif percentage_used >= 80:
        status = "warning"
    else:
        status = "normal"    
 

    cursor.close()
    connection.close()

    return {
        "month": month,
        "salary": float(budget["salary"]),
        "savings_goal": float(budget["savings_goal"]),
        "spending_budget": spending_budget,
        "carry_over": carry_over,
        "effective_budget": effective_budget,
        "total_spent": total_spent,
        "remaining": remaining,
        "percentage_used": round(percentage_used, 2),
        "over_budget": over_budget,
        "status": status
    }
if __name__ == "__main__":
  
 app.run(host="0.0.0.0", port=5000, debug=True)