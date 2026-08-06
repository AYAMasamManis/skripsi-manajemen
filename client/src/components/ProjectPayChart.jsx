import PropTypes from 'prop-types'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function ProjectPayChart({ projects = [], isDarkMode = false }) {
  const textColor = isDarkMode ? '#d6d6d6' : '#333333'
  const gridColor = isDarkMode ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'
  const data = {
    labels: projects.map((project) => project.nama_proyek),
    datasets: [
      { label: 'Material', data: projects.map((project) => project.material), backgroundColor: '#2e2e2e' },
      { label: 'Upah', data: projects.map((project) => project.upah), backgroundColor: '#777777' },
      { label: 'Subcon', data: projects.map((project) => project.subcon), backgroundColor: '#b8b8b8' },
    ],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: textColor, usePointStyle: true, boxWidth: 8 } },
      title: { display: true, text: 'PAY CHART PER PROYEK', color: textColor, font: { size: 11 }, padding: 16 },
      tooltip: { callbacks: { label: (context) => `${context.dataset.label}: Rp ${Number(context.raw || 0).toLocaleString('id-ID')}` } },
    },
    scales: {
      x: { stacked: true, ticks: { color: textColor }, grid: { display: false } },
      y: { stacked: true, beginAtZero: true, ticks: { color: textColor, callback: (value) => `Rp ${Number(value).toLocaleString('id-ID')}` }, grid: { color: gridColor } },
    },
  }

  return <div style={{ height: 340, padding: '10px 20px 20px' }}><Bar data={data} options={options} /></div>
}

ProjectPayChart.propTypes = {
  projects: PropTypes.array,
  isDarkMode: PropTypes.bool,
}

export default ProjectPayChart
