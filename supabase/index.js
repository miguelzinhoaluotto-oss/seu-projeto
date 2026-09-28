const SUPABASE_URL = "https://irhxagxphqmtycqnqfql.supabase.co"
const SUPABASE_KEY = "sb_publishable_lVcuD_yqbnmNx-d5r28Ybw_2MZVwPiX"

const { createClient } = supabase;
const banco = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
const lista = document.getElementById("lista");
const form = document.getElementById("formChamado")

async function mostrarChamados(){
    const {data, error} = await banco.from("chamados").select("*");
    if (error){
        console.log(error);
        return;
    } lista.innerHTML = JSON.stringify(data);
}
form.addEventListener("submit", async function(event)
    {event.preventDefault();
    const equipamento = document.getElementById("equipamento").value;
    const problema = document.getElementById("problema").value;
    const prioridade = document.getElementById("prioridade").value;
    const descricao = document.getElementById("descricao").value;


    const {error } = await banco
        .from("chamados")
        .insert([
            {
                equipamento: equipamento,
                problema: problema,
                prioridade: prioridade,
                descricao: descricao
            }
        ]);
    if (error){
        console.log(error);
        return;
}
 alert("Chamado enviado com sucesso!");
 form.reset();
 mostrarChamados();
});
mostrarChamados();