import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

const COLORS = [
  "oklch(0.55 0.16 142)",
  "oklch(0.72 0.18 130)",
  "oklch(0.82 0.16 85)",
  "oklch(0.42 0.12 255)",
  "oklch(0.62 0.18 30)",
];

const tooltipStyle = {
  background: "oklch(1 0 0)",
  border: "1px solid oklch(0.92 0.02 145)",
  borderRadius: 12,
  fontSize: 12,
};

export function TiposChart({ data }: { data: { nome: string; qtd: number }[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 145)" />
          <XAxis
            dataKey="nome"
            stroke="oklch(0.5 0.04 250)"
            fontSize={10}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={70}
            tickMargin={6}
          />
          <YAxis stroke="oklch(0.5 0.04 250)" fontSize={10} allowDecimals={false} width={28} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="qtd" fill="oklch(0.55 0.16 142)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StatusPieChart({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((s, i) => (
              <Cell key={i} fill={s.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend verticalAlign="bottom" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ElaboracaoMensalChart({ data }: { data: { mes: string; qtd: number }[] }) {
  return (
    <div className="h-60">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 145)" />
          <XAxis
            dataKey="mes"
            stroke="oklch(0.5 0.04 250)"
            fontSize={10}
            interval={0}
            tickMargin={4}
          />
          <YAxis stroke="oklch(0.5 0.04 250)" fontSize={11} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="qtd" fill="oklch(0.55 0.16 142)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ContabChart({ data }: { data: { nome: string; empresas: number }[] }) {
  return (
    <div className="h-60">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 145)" />
          <XAxis type="number" stroke="oklch(0.5 0.04 250)" fontSize={11} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="nome"
            stroke="oklch(0.5 0.04 250)"
            fontSize={11}
            width={140}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="empresas" fill="oklch(0.42 0.12 255)" radius={[0, 8, 8, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EmpresasConcluidasChart({ data }: { data: { mes: string; qtd: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.02 145)" />
          <XAxis
            dataKey="mes"
            stroke="oklch(0.5 0.04 250)"
            fontSize={11}
            interval={0}
            tickMargin={4}
          />
          <YAxis stroke="oklch(0.5 0.04 250)" fontSize={11} allowDecimals={false} width={28} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            type="monotone"
            dataKey="qtd"
            stroke="oklch(0.55 0.16 142)"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "oklch(0.55 0.16 142)" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
