const video = document.getElementById("video");
const resultado = document.getElementById("resultado");


const detector = new FaceDetection({

    locateFile: (file) => {
        return "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/" + file;
    }

});


detector.setOptions({

    model: "short",
    minDetectionConfidence: 0.5

});


detector.onResults((results) => {

    
    if (results.detections.length > 0) {

        resultado.innerText = "🟢 ACESSO PERMITIDO";
        resultado.style.color = "green";

    } else {

        resultado.innerText = "🔴 ACESSO NEGADO";
        resultado.style.color = "red";

    }

});



async function iniciarCamera() {

    try {

       
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true
        });

        
        video.srcObject = stream;

        video.onloadedmetadata = () => {

           
            const camera = new Camera(video, {

                onFrame: async () => {

                    await detector.send({
                        image: video
                    });

                },

                width: 640,
                height: 480

            });

            
            camera.start();

            
            resultado.innerText = "🔍 Verificando...";
            resultado.style.color = "black";

        };

    } catch (erro) {

        console.error("Erro ao acessar câmera:", erro);

        
        resultado.innerText = "🔴 ACESSO NEGADO";
        resultado.style.color = "red";

    }

}



iniciarCamera();