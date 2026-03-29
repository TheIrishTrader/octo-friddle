import { useState } from "react";
import { useBudget, useSpendingTrends } from "@/hooks/useBudget";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function BudgetPage() {
  const [month] = useState(currentMonth);
  const { budget, isLoading, createBudget, isCreating } = useBudget(month);
  const { data: trends } = useSpendingTrends(6);
  const [budgetInput, setBudgetInput] = useState("");

  const handleCreateBudget = () => {
    const amount = parseFloat(budgetInput);
    if (isNaN(amount) || amount <= 0) return;
    createBudget({ month, budgetAmount: amount });
    setBudgetInput("");
  };

  if (isLoading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  const spent = budget?.totalSpent ?? 0;
  const limit = budget?.budgetAmount ?? 0;
  const remaining = limit - spent;
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const overBudget = remaining < 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Budget</h1>
        <p className="page-subtitle">{month}</p>
      </div>

      {limit > 0 ? (
        <div className="budget-header-card">
          <div className="budget-label">Spent this month</div>
          <div className="budget-amount">${spent.toFixed(2)}</div>
          <div className="budget-remaining">
            {overBudget
              ? `$${Math.abs(remaining).toFixed(2)} over budget`
              : `$${remaining.toFixed(2)} remaining of $${limit.toFixed(2)}`}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${pct}%`, background: overBudget ? "var(--red-500)" : "#fff" }}
            />
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 8 }}>Set Monthly Budget</div>
          <div className="budget-edit-row">
            <input
              className="input"
              type="number"
              placeholder="e.g. 500"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateBudget()}
            />
            <button
              className="btn btn-primary"
              onClick={handleCreateBudget}
              disabled={isCreating || !budgetInput}
            >
              Set
            </button>
          </div>
        </div>
      )}

      {budget?.categoryBreakdown && budget.categoryBreakdown.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">By Category</div>
          </div>
          {budget.categoryBreakdown.map((cat) => (
            <div key={cat.category} className="category-row">
              <div className="category-name">{cat.category}</div>
              <div className="category-amount">${cat.spent.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

      {trends && trends.months && trends.months.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Spending Trend</div>
          </div>
          {trends.months.map((m) => {
            const maxSpent = Math.max(...trends.months.map((x) => x.totalSpent), 1);
            const barPct = (m.totalSpent / maxSpent) * 100;
            return (
              <div key={m.month} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{m.month}</span>
                  <span style={{ fontWeight: 600 }}>${m.totalSpent.toFixed(2)}</span>
                </div>
                <div className="progress-bar-gray">
                  <div
                    className={m.budgetAmount && m.totalSpent > m.budgetAmount ? "progress-fill-red" : "progress-fill-green"}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
