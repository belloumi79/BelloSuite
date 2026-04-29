'use client'

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

interface ChartData {
  name: string
  value: number
}

interface LineChartProps {
  data: Array<{ [key: string]: number | string }>
  dataKey: string
  name: string
  unit?: string
  height?: number
}

interface BarChartProps {
  data: ChartData[]
  dataKey: keyof ChartData
  name: string
  unit?: string
  height?: number
}

export function LineChartWrapper({ data, dataKey, name, unit, height = 200 }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => `${value} ${unit || ''}`} />
        <Legend verticalAlign="top" height={36} />
        <Line type="monotone" dataKey={dataKey} stroke="#8884d8" activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function BarChartWrapper({ data, dataKey, name, unit, height = 200 }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => `${value} ${unit || ''}`} />
        <Legend verticalAlign="top" height={36} />
        <Bar dataKey={dataKey} fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  )
}