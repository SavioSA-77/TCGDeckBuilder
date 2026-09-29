// Aguarda o carregamento completo do HTML antes de executar o script
document.addEventListener('DOMContentLoaded', () => {
    const inputSenha = document.getElementById('senha');
    const btnSenha = document.getElementById('btn-senha');

    btnSenha.addEventListener('click', () => {
        // Verifica o tipo atual do input. Se for password, muda pra text. Se não, volta pra password.
        const tipoAtual = inputSenha.getAttribute('type');
        
        if (tipoAtual === 'password') {
            inputSenha.setAttribute('type', 'text');
            btnSenha.textContent = '🙈'; // Muda o ícone (olho fechado)
        } else {
            inputSenha.setAttribute('type', 'password');
            btnSenha.textContent = '👁️'; // Volta o ícone original
        }
        //colocar imagem de olho psiquico
    });
});