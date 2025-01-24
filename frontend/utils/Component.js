export default class Component {
    render(container) {
        container.innerHTML = this.template();
    }
}