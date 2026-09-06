import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DecisionSupportPanel } from '../src/components/DecisionSupportPanel.jsx';

describe('行程决策与应变面板', () => {
  it('同时展示关键决策、触发条件、调整方案和优先级', () => {
    const html = renderToStaticMarkup(
      <DecisionSupportPanel
        trip={{
          keyDecisions: [{
            id: 'decision-1',
            decision: '提前一天抵达',
            reason: '避开假期首日客流',
            tradeoff: '首日只安排转场',
          }],
          fallbackPlans: [{
            id: 'fallback-1',
            trigger: '山区道路临时管制',
            action: '当晚改住起点城市',
            priority: '安全优先',
          }],
        }}
      />,
    );

    expect(html).toContain('行程决策与应变');
    expect(html).toContain('1 项决策 · 1 个预案');
    expect(html).toContain('提前一天抵达');
    expect(html).toContain('避开假期首日客流');
    expect(html).toContain('首日只安排转场');
    expect(html).toContain('山区道路临时管制');
    expect(html).toContain('当晚改住起点城市');
    expect(html).toContain('安全优先');
  });

  it('旧行程缺少两个字段时不渲染空面板', () => {
    expect(renderToStaticMarkup(<DecisionSupportPanel trip={{}} />)).toBe('');
  });

  it('仅有一种数据时仍可独立展示', () => {
    const html = renderToStaticMarkup(
      <DecisionSupportPanel trip={{ fallbackPlans: [{ trigger: '天气转差', action: '取消支线' }] }} />,
    );

    expect(html).toContain('1 个预案');
    expect(html).not.toContain('为什么这样安排');
    expect(html).toContain('天气转差');
  });
});
