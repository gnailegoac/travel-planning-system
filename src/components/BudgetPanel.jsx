import { Calculator, CircleDollarSign, CircleHelp, PiggyBank, Users } from 'lucide-react';
import { calculateBudget, CATEGORY_META, formatCurrency } from '../lib/trip.js';

export function BudgetPanel({ trip }) {
  const budget = calculateBudget(trip);

  return (
    <section className="budget-section" aria-labelledby="budget-title">
      <div className="section-heading budget-heading">
        <div>
          <span className="section-kicker">BUDGET PLAN</span>
          <h2 id="budget-title">费用预算</h2>
        </div>
        <span className="section-count">币种 · {trip.currency}</span>
      </div>

      <div className="budget-summary">
        <div className="budget-total-card">
          <span className="budget-card-icon"><CircleDollarSign size={23} /></span>
          <span>{budget.unpricedItemCount ? '当前已录入预算' : '含机动金的总预算'}</span>
          <strong>{budget.hasPricedItems ? formatCurrency(budget.total, trip.currency) : '待补充'}</strong>
          <small>
            {budget.unpricedItemCount
              ? `仍有 ${budget.unpricedItemCount} 项待补充金额`
              : `基础预算 ${formatCurrency(budget.subtotal, trip.currency)}`}
          </small>
        </div>
        <div className="budget-mini-card">
          <Users size={20} />
          <span>人均预算</span>
          <strong>{budget.hasPricedItems ? formatCurrency(budget.perPerson, trip.currency) : '待补充'}</strong>
          <small>按 {budget.travelerCount} 人平摊</small>
        </div>
        <div className="budget-mini-card">
          {budget.unpricedItemCount ? <CircleHelp size={20} /> : <PiggyBank size={20} />}
          <span>{budget.unpricedItemCount ? '待补充项目' : '机动金'}</span>
          <strong>{budget.unpricedItemCount ? `${budget.unpricedItemCount} 项` : formatCurrency(budget.contingency, trip.currency)}</strong>
          <small>{budget.unpricedItemCount ? '录入预订价后自动汇总' : `${Math.round(budget.contingencyRate * 100)}% 预留`}</small>
        </div>
      </div>

      <div className="budget-body">
        <div className="category-breakdown">
          <h3><Calculator size={18} /> 分类占比</h3>
          {budget.categories.length ? (
            <>
              <div className="stacked-budget" aria-label="费用分类占比">
                {budget.categories.map((category) => (
                  <span
                    key={category.id}
                    style={{ width: `${category.share * 100}%`, backgroundColor: category.color }}
                    title={`${category.label} ${Math.round(category.share * 100)}%`}
                  />
                ))}
              </div>
              <ul className="category-list">
                {budget.categories.map((category) => (
                  <li key={category.id}>
                    <span className="category-swatch" style={{ backgroundColor: category.color }} />
                    <span>{category.label}</span>
                    <strong>{formatCurrency(category.amount, trip.currency)}</strong>
                    <small>{Math.round(category.share * 100)}%</small>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="budget-empty">补充机票、租车、住宿等金额后，这里会自动生成分类占比。</p>
          )}
        </div>

        <div className="budget-table-wrap">
          <table className="budget-table">
            <caption className="sr-only">逐项费用预算</caption>
            <thead>
              <tr>
                <th scope="col">项目</th>
                <th scope="col">类别</th>
                <th scope="col">状态</th>
                <th scope="col">金额</th>
              </tr>
            </thead>
            <tbody>
              {budget.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <span>{item.note}</span>
                  </td>
                  <td>{CATEGORY_META[item.category]?.label ?? item.category}</td>
                  <td><span className="cost-status">{item.status}</span></td>
                  <td>{formatCurrency(item.projectedAmount, trip.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
