document.addEventListener('DOMContentLoaded', () => {
    const inputSenha = document.getElementById('senha');
    const btnSenha = document.getElementById('btn-senha');

    if (!inputSenha || !btnSenha) {
        return;
    }

    btnSenha.addEventListener('click', () => {
        const mostrarSenha = inputSenha.type === 'password';
        inputSenha.type = mostrarSenha ? 'text' : 'password';
        btnSenha.innerHTML = mostrarSenha
            ? '<img src="/images/olhoAberto.png" alt="">'
            : '<img src="/images/olhoFechado.png" alt="">';
        btnSenha.setAttribute('aria-label', mostrarSenha ? 'Ocultar senha' : 'Mostrar senha');
        btnSenha.setAttribute('aria-pressed', String(mostrarSenha));
    });
});