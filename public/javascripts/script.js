document.addEventListener('DOMContentLoaded', () => {
    const inputSenha = document.getElementById('senha');
    const btnSenha = document.getElementById('btn-senha');

    if (!inputSenha || !btnSenha) {
        return;
    }

    btnSenha.addEventListener('click', () => {
        const mostrarSenha = inputSenha.type === 'password';
        inputSenha.type = mostrarSenha ? 'text' : 'password';
        btnSenha.textContent = mostrarSenha ? '🙈' : '👁️';
        btnSenha.setAttribute('aria-label', mostrarSenha ? 'Ocultar senha' : 'Mostrar senha');
        btnSenha.setAttribute('aria-pressed', String(mostrarSenha));
    });
});