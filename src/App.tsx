import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend, TooltipProps
} from 'recharts';
import { 
  Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, 
  TrendingUp, Filter, Upload,
  Users, CheckCircle2, XCircle, Search, Calendar,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { CallRecord, TeamName } from './types.ts';
import { CONSULTANT_MAPPING } from './constants.ts';
import { cn, formatDuration } from './lib/utils.ts';

// --- Components ---

const StatCard = ({ title, value, subtext, icon: Icon, trend, colorClass = "primary" }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "bg-white p-6 rounded-2xl shadow-sm border flex items-start justify-between transition-all hover:shadow-md",
      colorClass === "primary" ? "border-adarco-light" : "border-slate-100"
    )}
  >
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className={cn(
        "text-2xl font-bold font-mono tracking-tight",
        colorClass === "primary" ? "text-adarco-dark" : "text-slate-900"
      )}>{value}</h3>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
      {trend !== undefined && (
        <span className={cn(
          "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full mt-2",
          trend >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        )}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div className={cn(
      "p-3 rounded-xl",
      colorClass === "primary" ? "bg-adarco-soft" : "bg-slate-50"
    )}>
      <Icon className={cn(
        "w-6 h-6",
        colorClass === "primary" ? "text-adarco-primary" : "text-slate-400"
      )} />
    </div>
  </motion.div>
);

const EmptyState = ({ onUpload }: { onUpload: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div className="w-20 h-20 bg-adarco-light/30 rounded-full flex items-center justify-center mb-6">
      <Users className="w-10 h-10 text-adarco-dark" />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Inside Sales</h2>
    <p className="text-gray-500 max-w-md mb-8">
      Carregue o log de telefonia (CSV) para visualizar a performance dos times de <strong>Débora</strong> e <strong>Marília</strong>.
    </p>
    <button 
      onClick={onUpload}
      className="flex items-center gap-2 bg-adarco-dark hover:bg-black text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg active:scale-95"
    >
      <Upload size={20} />
      Carregar Relatório CSV
    </button>
  </div>
);

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg">
        <p className="text-sm font-bold text-gray-800 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500">{entry.name}:</span>
            <span className="font-bold text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- Main App ---

export default function App() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [data, setData] = useState<CallRecord[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>('Todos');
  const [selectedConsultant, setSelectedConsultant] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const triggerFileUpload = () => {
    setErrorMsg(null);
    fileInputRef.current?.click();
  };

  const processFile = (file: File) => {
    setErrorMsg(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setErrorMsg("O arquivo parece estar vazio ou em formato inválido.");
          return;
        }

        const parsedData: CallRecord[] = results.data
          .map((row: any) => {
            const extensionRaw = String(row['Origem'] || row['Ramal'] || row['Extension'] || '').trim();
            const mapping = CONSULTANT_MAPPING[extensionRaw];
            
            if (!mapping) return null;

            const timestampStr = row['Data'] || row['timestamp'] || '';
            let timestamp = new Date();
            const formats = ['dd/MM/yyyy HH:mm:ss', 'yyyy-MM-dd HH:mm:ss', 'dd/MM/yyyy HH:mm'];

            for (const fmt of formats) {
              try {
                const p = parse(timestampStr, fmt, new Date(), { locale: ptBR });
                if (!isNaN(p.getTime())) {
                  timestamp = p;
                  break;
                }
              } catch (e) {}
            }

            const statusRaw = String(row['Status'] || row['status'] || '').toLowerCase();
            const status = statusRaw.includes('atend') ? 'Atendida' : 'Perdida';
            
            const typeRaw = String(row['Tipo'] || row['tipo'] || row['type'] || '').toLowerCase();
            const type = typeRaw.includes('entr') || typeRaw.includes('rec') ? 'Receptiva' : 'Ativa';

            const durationRaw = row['Duracao'] || row['Duração'] || row['duration'] || '0';

            return {
              extension: extensionRaw,
              type,
              status,
              duration: parseInt(durationRaw) || 0,
              timestamp: timestamp.toISOString(),
              consultantName: mapping.name,
              team: mapping.team
            };
          })
          .filter((item): item is CallRecord => item !== null);

        if (parsedData.length > 0) {
          setData(parsedData);
        } else {
          setErrorMsg("Nenhum dado de Inside Sales (Débora/Marília) foi encontrado no arquivo.");
        }
      },
      error: (error) => {
        setErrorMsg("Erro ao processar CSV: " + error.message);
      }
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
    if (event.target) event.target.value = '';
  };

  const availableConsultants = useMemo(() => {
    const baseList = Object.values(CONSULTANT_MAPPING);
    if (selectedTeam === 'Todos') return ['Todos', ...Array.from(new Set(baseList.map(c => c.name)))].sort();
    return ['Todos', ...baseList.filter(c => c.team === selectedTeam).map(c => c.name)].sort();
  }, [selectedTeam]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesTeam = selectedTeam === 'Todos' || item.team === selectedTeam;
      const matchesConsultant = selectedConsultant === 'Todos' || item.consultantName === selectedConsultant;
      const matchesSearch = searchQuery === '' || 
        item.consultantName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.extension.includes(searchQuery);

      return matchesTeam && matchesConsultant && matchesSearch;
    });
  }, [data, selectedTeam, selectedConsultant, searchQuery]);

  const activeCallsByConsultant = useMemo(() => {
    const counts: Record<string, { name: string, count: number, team: string }> = {};
    const baseData = selectedTeam === 'Todos' ? data : data.filter(d => d.team === selectedTeam);
    
    Object.values(CONSULTANT_MAPPING).forEach(c => {
       if (selectedTeam === 'Todos' || c.team === selectedTeam) {
         counts[c.name] = { name: c.name, count: 0, team: c.team };
       }
    });

    baseData.filter(d => d.type === 'Ativa').forEach(d => {
      if (d.consultantName && counts[d.consultantName]) {
        counts[d.consultantName].count++;
      }
    });

    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [data, selectedTeam]);

  const successCallsByConsultant = useMemo(() => {
    const counts: Record<string, { name: string, count: number, team: string }> = {};
    const baseData = selectedTeam === 'Todos' ? data : data.filter(d => d.team === selectedTeam);

    Object.values(CONSULTANT_MAPPING).forEach(c => {
       if (selectedTeam === 'Todos' || c.team === selectedTeam) {
         counts[c.name] = { name: c.name, count: 0, team: c.team };
       }
    });

    baseData.filter(d => d.status === 'Atendida').forEach(d => {
      if (d.consultantName && counts[d.consultantName]) {
        counts[d.consultantName].count++;
      }
    });

    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [data, selectedTeam]);

  const teamComparison = useMemo(() => {
    const stats = {
      [TeamName.DEBORA]: { name: TeamName.DEBORA, total: 0, success: 0 },
      [TeamName.MARILIA]: { name: TeamName.MARILIA, total: 0, success: 0 }
    };
    data.forEach(d => {
      if (d.team && stats[d.team]) {
        stats[d.team].total++;
        if (d.status === 'Atendida') stats[d.team].success++;
      }
    });
    return Object.values(stats);
  }, [data]);

  const kpis = useMemo(() => {
    const total = filteredData.length;
    const active = filteredData.filter(d => d.type === 'Ativa').length;
    const success = filteredData.filter(d => d.status === 'Atendida').length;
    const successRate = total > 0 ? (success / total) * 100 : 0;
    
    return { total, active, success, successRate };
  }, [filteredData]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900 font-sans selection:bg-adarco-light selection:text-adarco-dark border-none">
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".csv" 
        className="hidden" 
        onChange={handleFileUpload} 
      />

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-white border-r border-slate-200 overflow-hidden sticky top-0 h-screen hidden md:block"
      >
        <div className="p-6 w-[280px]">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-adarco-dark rounded-xl flex items-center justify-center shadow-lg shadow-adarco-light/50">
              <PhoneCall className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">ADARCO</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">BI Telephony</p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 block">Dashboard</label>
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-adarco-soft text-adarco-dark font-semibold text-sm">
                  <TrendingUp className="w-4 h-4" />
                  Inside Sales
                </button>
              </nav>
            </div>

            <div className="space-y-5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Filtros</label>
              
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500">Supervisão / Time</p>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-3 pr-8 text-sm font-medium appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                    value={selectedTeam}
                    onChange={(e) => {
                      setSelectedTeam(e.target.value);
                      setSelectedConsultant('Todos');
                    }}
                  >
                    <option value="Todos">Todos os Times</option>
                    <option value={TeamName.DEBORA}>Time Débora</option>
                    <option value={TeamName.MARILIA}>Time Marília</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500">Consultor</p>
                <div className="relative">
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-3 pr-8 text-sm font-medium appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                    value={selectedConsultant}
                    onChange={(e) => setSelectedConsultant(e.target.value)}
                  >
                    {availableConsultants.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={triggerFileUpload}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  Atualizar Dados
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 md:px-10 py-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Performance Inside Sales</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                <Calendar className="w-3 h-3" />
                {data.length > 0 ? "Dados Ativos" : "Aguardando importação"}
              </span>
              <div className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className="text-[10px] font-bold text-adarco-dark bg-adarco-soft px-2 py-0.5 rounded-full uppercase tracking-tighter">
                Foco em Resultados
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Pesquisar..."
                  className="bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-[200px] md:w-[280px] shadow-sm transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm md:hidden"
             >
                <Filter className="w-5 h-5" />
             </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {data.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <EmptyState onUpload={triggerFileUpload} />
              {errorMsg && (
                <p className="mt-4 text-center text-sm font-bold text-red-500 bg-red-50 py-2 rounded-lg max-w-sm mx-auto">
                  {errorMsg}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8 pb-20"
            >
              {/* KPIs Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Total de Ligações" 
                  value={kpis.total} 
                  subtext="Volume bruto identificado"
                  icon={Phone}
                  colorClass="secondary"
                />
                <StatCard 
                  title="Ligações Ativas" 
                  value={kpis.active} 
                  subtext="Prospecção direta"
                  icon={PhoneOutgoing}
                  colorClass="secondary"
                />
                <StatCard 
                  title="Sucesso (Atendidas)" 
                  value={kpis.success} 
                  subtext="Contatos efetivos"
                  icon={CheckCircle2}
                  colorClass="primary"
                />
                <StatCard 
                  title="Conversão de Contato" 
                  value={`${kpis.successRate.toFixed(1)}%`}
                  subtext="Taxa de sucesso global"
                  icon={TrendingUp}
                  trend={kpis.successRate > 70 ? 4 : -2}
                  colorClass="primary"
                />
              </div>

              {/* Central Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gráfico A */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Volume de Ligações Ativas</h3>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Por Consultor</p>
                    </div>
                    <div className="p-3 bg-adarco-soft rounded-2xl">
                      <PhoneOutgoing className="w-5 h-5 text-adarco-dark" />
                    </div>
                  </div>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={activeCallsByConsultant} 
                        layout="vertical" 
                        margin={{ left: 60, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          style={{ fontSize: '12px', fontWeight: 600, fill: '#475569' }}
                          width={100}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(20, 61, 45, 0.05)' }} />
                        <Bar 
                          dataKey="count" 
                          name="Ligações Ativas"
                          radius={[0, 8, 8, 0]} 
                          barSize={32}
                        >
                           {activeCallsByConsultant.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.team === TeamName.DEBORA ? '#064E3B' : '#10B981'} />
                           ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico B */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Chamadas Atendidas (Sucesso)</h3>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Contatos Efetivos</p>
                    </div>
                    <div className="p-3 bg-adarco-light/20 rounded-2xl">
                      <CheckCircle2 className="w-5 h-5 text-adarco-primary" />
                    </div>
                  </div>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={successCallsByConsultant} 
                        layout="vertical" 
                        margin={{ left: 60, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          style={{ fontSize: '12px', fontWeight: 600, fill: '#475569' }}
                          width={100}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
                        <Bar 
                          dataKey="count" 
                          name="Contatos Efetivos"
                          radius={[0, 8, 8, 0]} 
                          barSize={32}
                        >
                           {successCallsByConsultant.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.team === TeamName.DEBORA ? '#065F46' : '#34D399'} />
                           ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Performance Comparativa */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Performance Comparativa de Times</h3>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Débora vs Marília</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {teamComparison.map(team => (
                    <div key={team.name} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">{team.name}</span>
                        <span className="text-sm font-bold text-slate-400">
                          {team.success} / {team.total} <span className="text-[10px] ml-1 uppercase">Chamadas</span>
                        </span>
                      </div>
                      <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${team.total > 0 ? (team.success / team.total) * 100 : 0}%` }}
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            team.name === TeamName.DEBORA ? "bg-adarco-dark" : "bg-adarco-primary"
                          )}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-400">EFICIÊNCIA</span>
                        <span className={team.name === TeamName.DEBORA ? "text-adarco-dark" : "text-adarco-primary"}>
                          {team.total > 0 ? ((team.success / team.total) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="font-bold text-slate-800">Detalhamento por Consultor</h3>
                    <p className="text-xs text-slate-400 font-medium">Filtro aplicado: {selectedTeam} / {selectedConsultant}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white border-b border-slate-100">
                        <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Consultor</th>
                        <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Time</th>
                        <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Ramal</th>
                        <th className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Duração</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredData.slice(0, 10).map((call, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm",
                                call.team === TeamName.DEBORA ? "bg-adarco-dark text-white" : "bg-adarco-light text-adarco-dark"
                              )}>
                                {call.consultantName?.[0]}
                              </div>
                              <span className="text-sm font-bold text-slate-700">{call.consultantName}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-xs font-semibold text-slate-400">{call.team}</td>
                          <td className="px-8 py-5 font-mono text-xs text-slate-500">{call.extension}</td>
                          <td className="px-8 py-5 text-right font-mono text-sm font-semibold text-slate-600">
                            {formatDuration(call.duration)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
