from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    es_host: str = "localhost:9200"
    mongo_uri: str = "mongodb://localhost:27017/oab_simulado"
    jwt_secret: str = "changeme"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24
    admin_email: str = "admin@oab.com"
    admin_password: str = "admin123"
    admin_name: str = "Administrador"
    data_dir: str = "/data/questoes"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

OAB_STRUCTURE: dict[str, int] = {
    "Ética Profissional": 8,
    "Direito Civil": 6,
    "Direito Processual Civil": 6,
    "Direito Constitucional": 6,
    "Direito Penal": 6,
    "Direito Processual Penal": 6,
    "Direito Administrativo": 5,
    "Direito do Trabalho": 5,
    "Direito Processual do Trabalho": 5,
    "Direito Tributário": 5,
    "Direito Empresarial": 4,
    "Direitos Humanos": 2,
    "Direito Internacional": 2,
    "Direito Ambiental": 2,
    "Direito do Consumidor": 2,
    "Direito da Criança e do Adolescente (ECA)": 2,
    "Filosofia do Direito": 2,
    "Direito Previdenciário": 2,
    "Direito Financeiro e Orçamentário": 2,
    "Direito Eleitoral": 2,
}

DISC_MAPPING: dict[str, str] = {
    "ÉTICA": "Ética Profissional",
    "PROCESSO CIVIL": "Direito Processual Civil",
    "PROCESSO PENAL": "Direito Processual Penal",
    "TRABALHO": "Direito do Trabalho",
    "PROCESSO DO TRABALHO": "Direito Processual do Trabalho",
    "CIVIL": "Direito Civil",
    "PENAL": "Direito Penal",
    "CONSTITUCIONAL": "Direito Constitucional",
    "TRIBUTÁRIO": "Direito Tributário",
    "ADMINISTRATIVO": "Direito Administrativo",
    "EMPRESARIAL": "Direito Empresarial",
    "ESTATUTO DA CRIANÇA E DO ADOLESCENTE": "Direito da Criança e do Adolescente (ECA)",
    "CONSUMIDOR": "Direito do Consumidor",
    "ELEITORAL": "Direito Eleitoral",
    "PREVIDENCIÁRIO": "Direito Previdenciário",
    "AMBIENTAL": "Direito Ambiental",
    "INTERNACIONAL": "Direito Internacional",
    "DIREITOS HUMANOS": "Direitos Humanos",
    "FILOSOFIA": "Filosofia do Direito",
    "FINANCEIRO": "Direito Financeiro e Orçamentário",
    # Resultado files already correct
    "Ética Profissional": "Ética Profissional",
    "Direito Civil": "Direito Civil",
    "Direito Processual Civil": "Direito Processual Civil",
    "Direito Constitucional": "Direito Constitucional",
    "Direito Penal": "Direito Penal",
    "Direito Processual Penal": "Direito Processual Penal",
    "Direito Administrativo": "Direito Administrativo",
    "Direito do Trabalho": "Direito do Trabalho",
    "Direito Processual do Trabalho": "Direito Processual do Trabalho",
    "Direito Tributário": "Direito Tributário",
    "Direito Empresarial": "Direito Empresarial",
    "Direitos Humanos": "Direitos Humanos",
    "Direito Internacional": "Direito Internacional",
    "Direito Ambiental": "Direito Ambiental",
    "Direito do Consumidor": "Direito do Consumidor",
    "Filosofia do Direito": "Filosofia do Direito",
    "Direito Previdenciário": "Direito Previdenciário",
    "Direito Financeiro e Orçamentário": "Direito Financeiro e Orçamentário",
    "Direito Eleitoral": "Direito Eleitoral",
    "Não classificada": "Não classificada",
}
