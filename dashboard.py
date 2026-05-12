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
    
    # Substituir números de ramais por nomes e times
    def map_consultant(extension):
        ext = str(extension).strip()
        if ext in CONSULTANT_MAPPING:
            return CONSULTANT_MAPPING[ext]['name'], CONSULTANT_MAPPING[ext]['team']
        return None, None

    # Aplicar mapeamento (ajustar nomes de colunas conforme necessário)
    # Supondo que a coluna do ramal seja 'Origem' ou 'Extension'
    col_ramal = 'Origem' if 'Origem' in df.columns else 'Extension'
    
    df[['Consultor', 'Time']] = df[col_ramal].apply(lambda x: pd.Series(map_consultant(x)))
    
    # Requisitos de Filtragem e Segurança:
    # Bloqueio de Ramais Externos e Ocultar Não Identificados
    df = df.dropna(subset=['Consultor'])
    
    return df

st.title("📞 Dashboard Inside Sales - Adarco")

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

    st.subheader("Destaque Comparativo entre Times")
    team_comparison = df.groupby('Time').size()
    st.write(team_comparison)
else:
    st.info("Por favor, carregue um arquivo CSV para começar.")
