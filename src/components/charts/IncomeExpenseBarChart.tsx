import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type IncomeExpenseBarChartProps = {
  data: { month: string; income: number; expense: number }[];
};

const IncomeExpenseBarChart = ({ data }: IncomeExpenseBarChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value: number) => `${value.toLocaleString('ru-RU')} ₸`} />
        <Legend />
        <Bar dataKey="income" name="Доходы" fill="#10b981" />
        <Bar dataKey="expense" name="Расходы" fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IncomeExpenseBarChart;