'use client'

import { ExpenseStats } from '@/lib/expenses-api'

interface ExpenseChartsProps {
  stats: ExpenseStats
  getChildName: (childId: string) => string
}

export default function ExpenseCharts({ stats, getChildName }: ExpenseChartsProps) {
  if (!stats || stats.total === 0) {
    return null
  }

  // Цвета для категорий
  const categoryColors = [
    '#10b981', // зелёный
    '#3b82f6', // синий
    '#f59e0b', // оранжевый
    '#ef4444', // красный
    '#8b5cf6', // фиолетовый
    '#ec4899', // розовый
    '#14b8a6', // бирюзовый
    '#f97316', // оранжевый2
    '#06b6d4', // голубой
  ]

  // Данные для круговой диаграммы (топ-5 категорий)
  const topCategories = stats.byCategory.slice(0, 5)
  const othersAmount = stats.byCategory.slice(5).reduce((sum, cat) => sum + cat.amount, 0)
  
  const pieData = [...topCategories]
  if (othersAmount > 0) {
    pieData.push({
      categoryId: 'others',
      categoryName: 'Прочее',
      icon: '📦',
      amount: othersAmount,
      percentage: (othersAmount / stats.total) * 100
    })
  }

  // Расчёт углов для круговой диаграммы
  let currentAngle = 0
  const pieSegments = pieData.map((item, index) => {
    const angle = (item.percentage / 100) * 360
    const segment = {
      ...item,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      color: categoryColors[index % categoryColors.length]
    }
    currentAngle += angle
    return segment
  })

  // Функция для расчёта координат дуги
  function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(x, y, radius, endAngle)
    const end = polarToCartesian(x, y, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
    
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'L', x, y,
      'Z'
    ].join(' ')
  }

  function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    }
  }

  return (
    <div className="expense-charts">
      <h2 className="expense-charts-title">📊 Визуализация расходов</h2>
      
      <div className="charts-grid">
        {/* Круговая диаграмма */}
        <div className="chart-card">
          <h3 className="chart-card-title">По категориям</h3>
          <div className="pie-chart-container">
            <svg className="pie-chart" viewBox="0 0 200 200">
              {pieSegments.map((segment, index) => (
                <g key={segment.categoryId}>
                  <path
                    d={describeArc(100, 100, 80, segment.startAngle, segment.endAngle)}
                    fill={segment.color}
                    className="pie-segment"
                  />
                </g>
              ))}
              {/* Центральный круг для donut эффекта */}
              <circle cx="100" cy="100" r="50" fill="white" />
              <text x="100" y="95" textAnchor="middle" className="pie-total-label">Всего</text>
              <text x="100" y="115" textAnchor="middle" className="pie-total-amount">
                {(stats.total / 1000).toFixed(0)}K
              </text>
            </svg>
            
            {/* Легенда */}
            <div className="chart-legend">
              {pieSegments.map((segment, index) => (
                <div key={segment.categoryId} className="legend-item">
                  <div 
                    className="legend-color" 
                    style={{ background: segment.color }}
                  />
                  <span className="legend-icon">{segment.icon}</span>
                  <span className="legend-name">{segment.categoryName}</span>
                  <span className="legend-value">{segment.percentage.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Столбчатая диаграмма по детям */}
        {stats.byChild.length > 0 && (
          <div className="chart-card">
            <h3 className="chart-card-title">По детям</h3>
            <div className="bar-chart">
              {stats.byChild.map((child, index) => {
                const height = (child.amount / stats.total) * 100
                return (
                  <div key={child.childId} className="bar-item">
                    <div className="bar-container">
                      <div 
                        className="bar"
                        style={{ 
                          height: `${height}%`,
                          background: categoryColors[index]
                        }}
                      >
                        <span className="bar-percentage">{child.percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="bar-label">{getChildName(child.childId)}</div>
                    <div className="bar-amount">
                      {(child.amount / 1000).toFixed(1)}K ₽
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Топ категории */}
        <div className="chart-card chart-card-wide">
          <h3 className="chart-card-title">Топ категорий</h3>
          <div className="horizontal-bars">
            {stats.byCategory.slice(0, 6).map((category, index) => {
              const width = category.percentage
              return (
                <div key={category.categoryId} className="horizontal-bar-item">
                  <div className="horizontal-bar-header">
                    <div className="horizontal-bar-label">
                      <span className="horizontal-bar-icon">{category.icon}</span>
                      <span>{category.categoryName}</span>
                    </div>
                    <div className="horizontal-bar-value">
                      {(category.amount / 1000).toFixed(1)}K ₽
                    </div>
                  </div>
                  <div className="horizontal-bar-track">
                    <div 
                      className="horizontal-bar-fill"
                      style={{ 
                        width: `${width}%`,
                        background: categoryColors[index % categoryColors.length]
                      }}
                    >
                      <span className="horizontal-bar-percentage">{width.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
