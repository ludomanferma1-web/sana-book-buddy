import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type BalanceLineChartProps = {
  data: { month: string; balance: number }[];
};

const BalanceLineChart = ({ data }: BalanceLineChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₸`} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="balance" 
          name="Баланс" 
          stroke="#8b5cf6" 
          strokeWidth={2}
          dot={{ fill: '#8b5cf6' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default BalanceLineChart;