let camera = null;

document.addEventListener("DOMContentLoaded", () => {
    Atualizar();
    
    setInterval(Atualizar, 1000); 
});

function Atualizar() {
    const horario = new Date();

    document.getElementById("data").innerHTML =
        "Data: " + horario.toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    const diasSemana = [
        "domingo",
        "segunda-feira",
        "terça-feira",
        "quarta-feira",
        "quinta-feira",
        "sexta-feira",
        "sábado"
    ];

    const diaSemana = diasSemana[horario.getDay()];
    const diaFormatado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

    document.getElementById("dia").innerHTML = "Dia: " + diaFormatado;
    document.getElementById("hora").innerHTML = "Hora: " + horario.toLocaleTimeString("pt-BR");

    const horaAtual = horario.getHours();
    let saudacao = "";

    if (horaAtual < 12) {
        saudacao = "Bom dia!";
    } else if (horaAtual < 18) {
        saudacao = "Boa tarde!";
    } else {
        saudacao = "Boa noite!";
    }

    document.getElementById("saudacao").innerHTML = saudacao;
}

async function abrirCamera() {
    try {
        camera = await navigator.mediaDevices.getUserMedia({
            video: true
        });

        const video = document.getElementById("video");
        video.srcObject = camera;
        document.getElementById("camera").style.display = "block";
    } catch (erro) {
        alert("Não foi possível acessar a câmera. Garanta que deu permissão no navegador.");
        console.error(erro);
    }
}

function capturarFoto() {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");

  
    canvas.width = video.videoWidth || 400;
    canvas.height = video.videoHeight || 300;

    const contexto = canvas.getContext("2d");
    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);

    const foto = canvas.toDataURL("image/jpeg");
    const horario = new Date();

    const diasSemana = [
        "domingo",
        "segunda-feira",
        "terça-feira",
        "quarta-feira",
        "quinta-feira",
        "sexta-feira",
        "sábado"
    ];

    const dia = diasSemana[horario.getDay()];
    const data = horario.toLocaleDateString("pt-BR");
    const hora = horario.toLocaleTimeString("pt-BR");

    document.getElementById("registro").innerHTML = `
        <hr>
        <h2>📸 Foto capturada com sucesso!</h2>
        <p><strong>Dia:</strong> ${dia}</p>
        <p><strong>Data:</strong> ${data}</p>
        <p><strong>Horário:</strong> ${hora}</p>
        <h3>Pré-visualização da Foto:</h3>
        <img src="${foto}" width="400" alt="Foto do registro de ponto" style="border: 2px solid #000; border-radius: 8px;">
    `;

    fecharCamera();
}

function fecharCamera() {
    if (camera) {
        camera.getTracks().forEach(function(track) {
            track.stop();
        });
        camera = null;
    }
    document.getElementById("camera").style.display = "none";
}

function registrarPonto() {
    const nome = document.getElementById("nome").value.trim();
    const tipo = document.getElementById("tipoRegistro").value;
    const canvas = document.getElementById("canvas");

   
    if (nome === "") {
        alert("Por favor, digite o seu nome antes de registrar.");
        return;
    }

    
    if (canvas.width === 0 || canvas.height === 0) {
        alert("Por favor, clique em 'Abrir Câmera' e tire uma foto primeiro.");
        return;
    }
    
    
    const foto = canvas.toDataURL("image/png");

    const agora = new Date();
    const dataRegistro = agora.toLocaleDateString("pt-BR");
    const horaRegistro = agora.toLocaleTimeString("pt-BR");

    
    const registro = {
        nome: nome,
        tipo: tipo,
        data: dataRegistro,
        hora: horaRegistro,
        foto: foto
    };
  
    const pontosExistentes = JSON.parse(localStorage.getItem("historicoPontos")) || [];
    
   
    pontosExistentes.push(registro);
    
   
    localStorage.setItem("historicoPontos", JSON.stringify(pontosExistentes));

    
    const mensagem = document.getElementById("mensagemRegistrar");
    mensagem.innerHTML = "✅ Ponto gravado perfeitamente no LocalStorage!";
    mensagem.style.color = "green";
    mensagem.style.fontWeight = "bold";
    
    console.log("Registro salvo com sucesso:", registro);
}