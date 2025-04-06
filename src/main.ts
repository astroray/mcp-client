import { createApp } from 'vue'
import VueDOMPurifyHTML from 'vue-dompurify-html'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(VueDOMPurifyHTML)
app.mount('#app')
