import streamlit as st
import pandas as pd

# Mapeamento de Dados (Dicionário de Identidades)
CONSULTANT_MAPPING = {
    # Time Débora (Supervisora - Ramal 6005)
    "6028": {"name": "Charlene", "team": "Time Débora"},
    "6002": {"name": "Erick", "team": "Time Débora"},
    "6007": {"name": "Everton", "team": "Time Débora"},
    "6006": {"name": "Rodrigo", "team": "Time Débora"},
    "6045": {"name": "Marcos", "team": "Time Débora"},
    "6046": {"name": "Karina", "team": "Time Débora"},
    "6029": {"name": "Rute", "team": "Time Débora"},
    
    # Time Marília (Supervisora - Ramal 6038)
    "6036": {"name": "Aila", "team": "Time Marília"},
    "6026": {"name": "Kelvyn", "team": "Time Marília"},
    "6017": {"name": "Felipe", "team": "Time Marília"},
    "6037": {"name": "Roney", "team": "Time Marília"},
    "6022": {"name": "Gabriela", "team": "Time Marília"},
    "6039": {"name": "Hillary", "team": "Time Marília"},
    "6030": {"name": "Kephini", "team": "Time Marília"},
}

def load_and_filter_data(file):
    df = pd.read_csv(file)
    
    # Identifica colunas de origem e destino
    col_orig = next((c for c in ['Origem', 'Ramal', 'Extension'] if c in df.columns), None)
    col_dest = next((c for c in ['Destino', 'Destination', 'Número discado', 'Discado'] if c in df.columns), None)
    col_tipo = next((c for c in ['Tipo', 'Type', 'tipo'] if c in df.columns), None)

    # Função para mapear consultor e time verificando as duas pontas da chamada
    def map_columns(row):
        orig = str(row.get(col_orig, '')).strip() if col_orig else ''
        dest = str(row.get(col_dest, '')).strip() if col_dest else ''
        
        m_orig = CONSULTANT_MAPPING.get(orig)
        m_dest = CONSULTANT_MAPPING.get(dest)
        
        mapping = m_orig or m_dest
        if mapping:
            return mapping['name'], mapping['team'], 'Receptiva' if (m_dest and not m_orig) else 'Ativa'
        return None, None, 'Desconhecido'

    # Aplica o mapeamento e gera novas colunas
    map_results = df.apply(lambda r: map_columns(r), axis=1)
    df['Consultor'] = [r[0] for r in map_results]
    df['Time'] = [r[1] for r in map_results]
    
    # Se a coluna de tipo original existir, vamos aprimorar a detecção
    if col_tipo:
        def refine_type(row):
            t = str(row[col_tipo]).lower()
            if 'entr' in t or 'rec' in t or 'inbound' in t:
                return 'Receptiva'
            return row.get('Tipo_Detectado', 'Ativa') # Usa o que detectamos no mapeamento
            
        df['Tipo_Final'] = df.apply(refine_type, axis=1)
        df[col_tipo] = df['Tipo_Final'] # Sobrescreve para manter consistência
    
    # Requisitos de Filtragem e Segurança:
    # Bloqueio de Ramais Externos e Ocultar Não Identificados (Fora do Inside Sales)
    df = df.dropna(subset=['Consultor'])
    
    # Processamento de Datas
    col_data = 'Data' if 'Data' in df.columns else 'timestamp'
    if col_data in df.columns:
        df[col_data] = pd.to_datetime(df[col_data], errors='coerce')
        df = df.dropna(subset=[col_data])
    
    return df

# Configuração de Página e Estilo Customizado
st.set_page_config(page_title="Adarco BI - Inside Sales", layout="wide")

st.markdown("""
<style>
    /* Estilização Geral */
    .main {
        background-color: #F8F9FA;
    }
    .stApp {
        font-family: 'Montserrat', sans-serif;
    }
    
    /* Sidebar Dark Mode Estilizada com Degradê Neon Invertido e Laminado */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, rgba(0, 245, 138, 0.4) 0%, rgba(0, 77, 45, 0.95) 70%, #003B22 100%) !important;
        backdrop-filter: blur(20px);
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        color: white;
    }
    [data-testid="stSidebar"] .stDateInput label {
        color: rgba(255,255,255,0.9) !important;
        font-weight: 800 !important;
    }
    [data-testid="stSidebar"] input {
        background-color: rgba(255,255,255,0.1) !important;
        color: white !important;
        border: 1px solid rgba(255,255,255,0.2) !important;
    }
    
    /* Simulação de Glassmorphism nos Cards */
    .kpi-card {
        background-color: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(10px);
        padding: 1.5rem;
        border-radius: 20px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        border: 1px solid rgba(255, 255, 255, 0.5);
        transition: all 0.3s ease;
    }
    .kpi-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 15px rgba(0,0,0,0.05);
    }
    
    /* Títulos */
    h1, h2, h3 {
        color: #004D2C;
        font-weight: 800;
    }
    
    /* Botão de Ação */
    .stButton>button {
        background-color: #004D2C !important;
        color: white !important;
        border-radius: 12px !important;
        font-weight: bold !important;
        padding: 0.75rem 2rem !important;
        border: none !important;
        width: 100%;
        transition: all 0.3s;
    }
    .stButton>button:hover {
        background-color: #007A44 !important;
        box-shadow: 0 4px 12px rgba(0,77,44,0.3);
    }
</style>
""", unsafe_allow_html=True)

st.title("📞 Performance Inside Sales - Adarco")

uploaded_file = st.file_uploader("Carregue o arquivo CSV de Telefonia", type="csv")

if uploaded_file:
    df = load_and_filter_data(uploaded_file)
    
    # Filtros de Interface (Sidebar)
    st.sidebar.header("Filtros")
    time_selecionado = st.sidebar.selectbox("Filtro por Time/Supervisora", ["Todos", "Time Débora", "Time Marília"])
    
    df_filtered = df if time_selecionado == "Todos" else df[df['Time'] == time_selecionado]
    
    consultores_disponiveis = ["Todos"] + sorted(df_filtered['Consultor'].unique().tolist())
    consultor_selecionado = st.sidebar.selectbox("Filtro por Consultor", consultores_disponiveis)
    
    if consultor_selecionado != "Todos":
        df_filtered = df_filtered[df_filtered['Consultor'] == consultor_selecionado]

    # Filtro de Tipo (Topo da interface via rádio horizontal)
    st.write("---")
    tipo_selecionado = st.radio(
        "Tipo de Chamada",
        ["Todos", "Ativa", "Receptiva"],
        horizontal=True
    )
    if tipo_selecionado != "Todos":
        df_filtered = df_filtered[df_filtered[col_tipo].str.contains(tipo_selecionado, case=False, na=False)]

    # Filtro de Data
    col_data = 'Data' if 'Data' in df.columns else 'timestamp'
    if col_data in df_filtered.columns:
        min_date = df_filtered[col_data].min().date()
        max_date = df_filtered[col_data].max().date()
        
        st.sidebar.subheader("Período")
        date_range = st.sidebar.date_input(
            "Selecione o intervalo",
            value=(min_date, max_date),
            min_value=min_date,
            max_value=max_date
        )
        
        if len(date_range) == 2:
            start_date, end_date = date_range
            df_filtered = df_filtered[
                (df_filtered[col_data].dt.date >= start_date) & 
                (df_filtered[col_data].dt.date <= end_date)
            ]

    # Visualização e Gráficos
    st.subheader("Gráfico A: Volume Total de Ligações Ativas")
    # Filtro de tipo de ligação (ajustar nome da coluna se necessário)
    col_tipo = 'Tipo' if 'Tipo' in df.columns else 'Type'
    df_ativas = df_filtered[df_filtered[col_tipo].str.contains('Ativa', case=False, na=False)]
    
    active_counts = df_ativas['Consultor'].value_counts()
    st.bar_chart(active_counts)

    st.subheader("Gráfico B: Volume de Ligações Atendidas (Sucesso)")
    col_status = 'Status' if 'Status' in df.columns else 'status'
    df_atendidas = df_filtered[df_filtered[col_status].str.contains('Atendida', case=False, na=False)]
    
    success_counts = df_atendidas['Consultor'].value_counts()
    st.bar_chart(success_counts)

    st.subheader("Performance por Consultor (TMA e Conversão)")
    
    # Cálculo de métricas por consultor
    col_duracao = 'Duracao' if 'Duracao' in df.columns else ('Duração' if 'Duração' in df.columns else 'duration')
    col_status = 'Status' if 'Status' in df.columns else 'status'

    # Precisão: TMA deve considerar apenas a duração de chamadas Atendidas
    df_filtered['DuracaoAtendida'] = df_filtered.apply(
        lambda x: x[col_duracao] if 'atend' in str(x[col_status]).lower() else 0, axis=1
    )
    
    summary = df_filtered.groupby('Consultor').agg({
        col_tipo: 'count',
        col_status: lambda x: x.str.contains('Atendida', case=False, na=False).sum(),
        'DuracaoAtendida': 'sum'
    }).rename(columns={col_tipo: 'Total', col_status: 'Sucesso'})
    
    # Cálculo do TMA apenas para chamadas atendidas
    summary['TMA'] = summary.apply(
        lambda row: round(row['DuracaoAtendida'] / row['Sucesso'], 2) if row['Sucesso'] > 0 else 0, 
        axis=1
    )
    
    summary['Efetividade %'] = (summary['Sucesso'] / summary['Total'] * 100).round(1)
    
    st.write(summary[['Total', 'Sucesso', 'Efetividade %', 'TMA']])
    
    st.subheader("Destaque Comparativo entre Times")
    team_comparison = df.groupby('Time').size()
    st.write(team_comparison)
else:
    st.info("Por favor, carregue um arquivo CSV para começar.")
