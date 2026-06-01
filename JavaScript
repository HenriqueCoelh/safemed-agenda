const STORAGE = {
  pacientes: "safemed_pacientes",
  profissionais: "safemed_profissionais",
  consultas: "safemed_consultas"
};

let pacientes = JSON.parse(localStorage.getItem(STORAGE.pacientes)) || [];
let profissionais = JSON.parse(localStorage.getItem(STORAGE.profissionais)) || [];
let consultas = JSON.parse(localStorage.getItem(STORAGE.consultas)) || [];

const $ = (id) => document.getElementById(id);

function salvarDados() {
  localStorage.setItem(STORAGE.pacientes, JSON.stringify(pacientes));
  localStorage.setItem(STORAGE.profissionais, JSON.stringify(profissionais));
  localStorage.setItem(STORAGE.consultas, JSON.stringify(consultas));
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function formatarData(dataISO) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function mostrarToast(mensagem, tipo = "sucesso") {
  const toast = $("toast");
  toast.textContent = mensagem;
  toast.className = tipo === "erro" ? "toast error show" : "toast show";

  setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

function dataInvalida(dataISO) {
  if (!dataISO) return true;
  const data = new Date(dataISO + "T00:00:00");
  return Number.isNaN(data.getTime());
}

function alternarPagina(idPagina) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  document.querySelectorAll(".menu-btn").forEach((btn) => btn.classList.remove("active"));

  $(idPagina).classList.add("active");
  document.querySelector(`[data-target="${idPagina}"]`).classList.add("active");
}

document.querySelectorAll(".menu-btn").forEach((botao) => {
  botao.addEventListener("click", () => alternarPagina(botao.dataset.target));
});

function atualizarDashboard() {
  $("totalPacientes").textContent = pacientes.length;
  $("totalProfissionais").textContent = profissionais.length;
  $("totalAgendadas").textContent = consultas.filter(c => c.status === "Agendada").length;
  $("totalCanceladas").textContent = consultas.filter(c => c.status === "Cancelada").length;
}

function atualizarPacientes() {
  const lista = $("listaPacientes");
  const selectConsulta = $("consultaPaciente");

  lista.innerHTML = "";
  selectConsulta.innerHTML = '<option value="">Selecione o paciente</option>';

  if (pacientes.length === 0) {
    lista.innerHTML = '<p class="empty">Nenhum paciente cadastrado.</p>';
  }

  pacientes.forEach((paciente) => {
    lista.innerHTML += `
      <div class="list-item">
        <strong>${paciente.nome}</strong><br>
        Telefone: ${paciente.telefone}<br>
        Nascimento: ${formatarData(paciente.nascimento)}<br>
        E-mail: ${paciente.email || "Não informado"}
      </div>
    `;

    selectConsulta.innerHTML += `<option value="${paciente.id}">${paciente.nome}</option>`;
  });
}

function atualizarProfissionais() {
  const lista = $("listaProfissionais");
  const selectConsulta = $("consultaProfissional");
  const selectAgenda = $("agendaProfissional");

  lista.innerHTML = "";
  selectConsulta.innerHTML = '<option value="">Selecione o profissional</option>';
  selectAgenda.innerHTML = '<option value="">Selecione o profissional</option>';

  if (profissionais.length === 0) {
    lista.innerHTML = '<p class="empty">Nenhum profissional cadastrado.</p>';
  }

  profissionais.forEach((profissional) => {
    lista.innerHTML += `
      <div class="list-item">
        <strong>${profissional.nome}</strong><br>
        Especialidade: ${profissional.especialidade}<br>
        Registro: ${profissional.registro || "Não informado"}<br>
        Atendimento: ${profissional.inicio} às ${profissional.fim}
      </div>
    `;

    const texto = `${profissional.nome} - ${profissional.especialidade}`;
    selectConsulta.innerHTML += `<option value="${profissional.id}">${texto}</option>`;
    selectAgenda.innerHTML += `<option value="${profissional.id}">${texto}</option>`;
  });
}

function buscarPaciente(id) {
  return pacientes.find((paciente) => paciente.id === id);
}

function buscarProfissional(id) {
  return profissionais.find((profissional) => profissional.id === id);
}

function existeConflito(profissionalId, data, horario, idIgnorado = null) {
  return consultas.some((consulta) => {
    return consulta.id !== idIgnorado &&
      consulta.profissionalId === profissionalId &&
      consulta.data === data &&
      consulta.horario === horario &&
      consulta.status === "Agendada";
  });
}

function horarioForaAtendimento(profissionalId, horario) {
  const profissional = buscarProfissional(profissionalId);
  if (!profissional) return true;
  return horario < profissional.inicio || horario > profissional.fim;
}

function atualizarConsultas() {
  const tbody = $("tabelaConsultas");
  const filtroData = $("filtroConsultasData").value;

  let consultasVisiveis = [...consultas];

  if (filtroData) {
    consultasVisiveis = consultasVisiveis.filter((consulta) => consulta.data === filtroData);
  }

  consultasVisiveis.sort((a, b) => {
    return `${a.data} ${a.horario}`.localeCompare(`${b.data} ${b.horario}`);
  });

  tbody.innerHTML = "";

  if (consultasVisiveis.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Nenhuma consulta encontrada.</td></tr>';
    return;
  }

  consultasVisiveis.forEach((consulta) => {
    const paciente = buscarPaciente(consulta.pacienteId);
    const profissional = buscarProfissional(consulta.profissionalId);

    tbody.innerHTML += `
      <tr>
        <td>${paciente ? paciente.nome : "Paciente removido"}</td>
        <td>${profissional ? profissional.nome : "Profissional removido"}</td>
        <td>${formatarData(consulta.data)}</td>
        <td>${consulta.horario}</td>
        <td>${consulta.tipo}</td>
        <td><span class="status ${consulta.status.toLowerCase()}">${consulta.status}</span></td>
        <td>
          <div class="actions-table">
            <button class="btn btn-warning btn-small" onclick="prepararRemarcacao('${consulta.id}')" ${consulta.status === "Cancelada" ? "disabled" : ""}>
              Remarcar
            </button>
            <button class="btn btn-danger btn-small" onclick="cancelarConsulta('${consulta.id}')" ${consulta.status === "Cancelada" ? "disabled" : ""}>
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

function atualizarAgenda(profissionalId = "", data = "") {
  const resultado = $("resultadoAgenda");

  if (!profissionalId || !data) {
    resultado.innerHTML = "Informe o profissional e a data para consultar a agenda.";
    return;
  }

  const profissional = buscarProfissional(profissionalId);

  if (!profissional) {
    resultado.innerHTML = "Profissional não encontrado.";
    return;
  }

  const horariosPadrao = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  const horarios = horariosPadrao.filter(h => h >= profissional.inicio && h <= profissional.fim);

  if (horarios.length === 0) {
    resultado.innerHTML = '<p class="empty">Não há horários configurados para esse profissional nesta faixa.</p>';
    return;
  }

  resultado.innerHTML = "";

  horarios.forEach((horario) => {
    const consulta = consultas.find((item) =>
      item.profissionalId === profissionalId &&
      item.data === data &&
      item.horario === horario &&
      item.status === "Agendada"
    );

    if (consulta) {
      const paciente = buscarPaciente(consulta.pacienteId);
      resultado.innerHTML += `
        <div class="slot ocupado">
          <strong>${horario}</strong>
          <span>Agendada - ${paciente ? paciente.nome : "Paciente não encontrado"}</span>
        </div>
      `;
    } else {
      resultado.innerHTML += `
        <div class="slot disponivel">
          <strong>${horario}</strong>
          <span>Disponível</span>
        </div>
      `;
    }
  });
}

function limparFormularioConsulta() {
  $("consultaId").value = "";
  $("formConsulta").reset();
  $("btnSalvarConsulta").textContent = "Confirmar Agendamento";
}

$("formPaciente").addEventListener("submit", (event) => {
  event.preventDefault();

  const nome = $("pacienteNome").value.trim();
  const telefone = $("pacienteTelefone").value.trim();
  const nascimento = $("pacienteNascimento").value;
  const email = $("pacienteEmail").value.trim();

  if (!nome || !telefone || !nascimento) {
    mostrarToast("Preencha todos os campos obrigatórios do paciente.", "erro");
    return;
  }

  if (dataInvalida(nascimento)) {
    mostrarToast("Data de nascimento inválida.", "erro");
    return;
  }

  pacientes.push({
    id: gerarId(),
    nome,
    telefone,
    nascimento,
    email
  });

  salvarDados();
  atualizarTudo();
  event.target.reset();
  mostrarToast("Paciente cadastrado com sucesso.");
});

$("formProfissional").addEventListener("submit", (event) => {
  event.preventDefault();

  const nome = $("profissionalNome").value.trim();
  const especialidade = $("profissionalEspecialidade").value.trim();
  const registro = $("profissionalRegistro").value.trim();
  const telefone = $("profissionalTelefone").value.trim();
  const inicio = $("profissionalInicio").value;
  const fim = $("profissionalFim").value;

  if (!nome || !especialidade || !inicio || !fim) {
    mostrarToast("Preencha todos os campos obrigatórios do profissional.", "erro");
    return;
  }

  if (inicio >= fim) {
    mostrarToast("O horário inicial deve ser menor que o horário final.", "erro");
    return;
  }

  profissionais.push({
    id: gerarId(),
    nome,
    especialidade,
    registro,
    telefone,
    inicio,
    fim
  });

  salvarDados();
  atualizarTudo();
  event.target.reset();
  mostrarToast("Profissional cadastrado com sucesso.");
});

$("formConsulta").addEventListener("submit", (event) => {
  event.preventDefault();

  const id = $("consultaId").value;
  const pacienteId = $("consultaPaciente").value;
  const profissionalId = $("consultaProfissional").value;
  const data = $("consultaData").value;
  const horario = $("consultaHorario").value;
  const tipo = $("consultaTipo").value;
  const observacoes = $("consultaObservacoes").value.trim();

  if (!pacienteId || !profissionalId || !data || !horario) {
    mostrarToast("Preencha todos os campos obrigatórios da consulta.", "erro");
    return;
  }

  if (dataInvalida(data)) {
    mostrarToast("Data da consulta inválida.", "erro");
    return;
  }

  if (horarioForaAtendimento(profissionalId, horario)) {
    mostrarToast("Horário fora do período de atendimento do profissional.", "erro");
    return;
  }

  if (existeConflito(profissionalId, data, horario, id || null)) {
    mostrarToast("Horário indisponível para este profissional.", "erro");
    return;
  }

  if (id) {
    const consulta = consultas.find((item) => item.id === id);
    consulta.pacienteId = pacienteId;
    consulta.profissionalId = profissionalId;
    consulta.data = data;
    consulta.horario = horario;
    consulta.tipo = tipo;
    consulta.observacoes = observacoes;
    consulta.status = "Agendada";

    mostrarToast("Consulta remarcada com sucesso.");
  } else {
    consultas.push({
      id: gerarId(),
      pacienteId,
      profissionalId,
      data,
      horario,
      tipo,
      observacoes,
      status: "Agendada"
    });

    mostrarToast("Consulta agendada com sucesso.");
  }

  salvarDados();
  limparFormularioConsulta();
  atualizarTudo();
});

$("formFiltroAgenda").addEventListener("submit", (event) => {
  event.preventDefault();

  const profissionalId = $("agendaProfissional").value;
  const data = $("agendaData").value;

  if (!profissionalId || !data) {
    mostrarToast("Selecione o profissional e a data para consultar a agenda.", "erro");
    return;
  }

  atualizarAgenda(profissionalId, data);
  mostrarToast("Agenda consultada com sucesso.");
});

$("filtroConsultasData").addEventListener("change", atualizarConsultas);

$("btnCancelarEdicao").addEventListener("click", () => {
  limparFormularioConsulta();
});

$("btnLimparDados").addEventListener("click", () => {
  const confirmar = confirm("Deseja realmente limpar todos os dados cadastrados?");
  if (!confirmar) return;

  pacientes = [];
  profissionais = [];
  consultas = [];
  salvarDados();
  atualizarTudo();
  mostrarToast("Dados apagados com sucesso.");
});

function prepararRemarcacao(id) {
  const consulta = consultas.find((item) => item.id === id);

  if (!consulta) {
    mostrarToast("Consulta não encontrada.", "erro");
    return;
  }

  $("consultaId").value = consulta.id;
  $("consultaPaciente").value = consulta.pacienteId;
  $("consultaProfissional").value = consulta.profissionalId;
  $("consultaData").value = consulta.data;
  $("consultaHorario").value = consulta.horario;
  $("consultaTipo").value = consulta.tipo;
  $("consultaObservacoes").value = consulta.observacoes || "";
  $("btnSalvarConsulta").textContent = "Confirmar Remarcação";

  alternarPagina("consultas");
  mostrarToast("Consulta carregada para remarcação.");
}

function cancelarConsulta(id) {
  const consulta = consultas.find((item) => item.id === id);

  if (!consulta) {
    mostrarToast("É necessário selecionar uma consulta para cancelar.", "erro");
    return;
  }

  const confirmar = confirm("Confirma o cancelamento desta consulta?");
  if (!confirmar) return;

  consulta.status = "Cancelada";
  salvarDados();
  atualizarTudo();
  mostrarToast("Consulta cancelada com sucesso.");
}

function carregarDadosDemonstracao() {
  if (pacientes.length || profissionais.length || consultas.length) return;

  const pacienteId = gerarId();
  const profissionalId = gerarId();

  pacientes.push({
    id: pacienteId,
    nome: "João da Silva",
    telefone: "(19) 99999-0000",
    nascimento: "1990-05-10",
    email: "joao@email.com"
  });

  profissionais.push({
    id: profissionalId,
    nome: "Dra. Juliana Silva",
    especialidade: "Clínica Geral",
    registro: "CRM 123456",
    telefone: "(19) 3333-0000",
    inicio: "08:00",
    fim: "18:00"
  });

  consultas.push({
    id: gerarId(),
    pacienteId,
    profissionalId,
    data: new Date().toISOString().slice(0, 10),
    horario: "09:00",
    tipo: "Consulta inicial",
    observacoes: "Consulta de demonstração",
    status: "Agendada"
  });

  salvarDados();
}

function atualizarTudo() {
  atualizarDashboard();
  atualizarPacientes();
  atualizarProfissionais();
  atualizarConsultas();

  const profissionalId = $("agendaProfissional").value;
  const data = $("agendaData").value;
  atualizarAgenda(profissionalId, data);
}

carregarDadosDemonstracao();
atualizarTudo();
