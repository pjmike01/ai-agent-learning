import DefaultTheme from 'vitepress/theme'
import ResourceCard from './components/ResourceCard.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ResourceCard', ResourceCard)
  },
}
