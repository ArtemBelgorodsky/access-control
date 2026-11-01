<script setup>
import { ref } from 'vue';
import Icon from './Icon.vue';
import { login, registerAccount, notify } from '../store.js';

const email = ref(''), password = ref(''), fullName = ref('');
const registering = ref(false), loading = ref(false), error = ref('');
async function submit() {
  error.value = ''; loading.value = true;
  try {
    if (registering.value) {
      await registerAccount({ fullName: fullName.value, email: email.value, password: password.value });
      notify('Учётная запись администратора создана.');
    }
    await login({ email: email.value, password: password.value });
  } catch (e) { error.value = e.message; }
  finally { password.value = ''; loading.value = false; }
}
</script>

<template>
  <div class="login-screen">
    <section class="login-intro">
      <a class="brand" href="#"><span class="brand-mark"><Icon name="rooms" :size="30" /></span><div>рубеж<span>УПРАВЛЕНИЕ ДОСТУПОМ</span></div></a>
      <div class="login-story">
        <h1 class="login-system-title">Информационная система управления доступом сотрудников в помещения организации</h1>
      </div>
    </section>
    <section class="login-form-area">
      <div class="login-form-wrap">
        <span class="login-form-code"><Icon name="lock" :size="16" />{{ registering ? '01 / НАСТРОЙКА СИСТЕМЫ' : '01 / ВХОД В СИСТЕМУ' }}</span>
        <h2>{{ registering ? 'Первый запуск' : 'Ваше рабочее пространство' }}</h2>
        <p class="muted">{{ registering ? 'Создайте учётную запись администратора.' : 'Войдите в систему управления доступом.' }}</p>
        <form @submit.prevent="submit">
          <label v-if="registering">Ваше имя<input v-model="fullName" autocomplete="name" placeholder="Александр Волков" required :disabled="loading" /></label>
          <label>Email<input v-model="email" type="email" autocomplete="username" placeholder="admin@example.ru" required :disabled="loading" /></label>
          <label>Пароль<input v-model="password" type="password" :autocomplete="registering ? 'new-password' : 'current-password'" :minlength="registering ? 8 : undefined" placeholder="Введите пароль" required :disabled="loading" /></label>
          <div v-if="error" class="alert-box" role="alert">{{ error }}</div>
          <button class="button primary full" type="submit" :disabled="loading"><Icon :name="loading ? 'loader' : 'arrow'" :class="{ spin: loading }" />{{ loading ? 'Подключаемся…' : registering ? 'Создать администратора и войти' : 'Войти в систему' }}</button>
        </form>
        <button class="text-button login-switch" :disabled="loading" @click="registering = !registering; error = ''">{{ registering ? 'Уже есть учётная запись? Войти' : 'Первый запуск? Создать администратора' }}</button>
        <div class="login-note"><Icon name="lock" :size="15" /><span>Пароль не сохраняется в браузере</span></div>
      </div>
      <span class="login-bottom">КОНТРОЛЬ ДОСТУПА <span>ЛЮДИ / ПОМЕЩЕНИЯ / СОБЫТИЯ</span></span>
    </section>
  </div>
</template>
