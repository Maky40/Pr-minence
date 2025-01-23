const image_42 = '/assets/42_Logo.svg';

class Button42 {
    constructor(btnText) {
        this.container = document.createElement('div');
        this.container.className = 'd-grid gap-2 mb-3';

        // Create button
        this.button = document.createElement('button');
        this.button.className = 'btn btn-success btn-lg px-5 py-3 rounded-pill shadow-sm w-100';
        this.button.type = 'button';

        // Create logo image
        const logo = document.createElement('img');
        logo.src = image_42;
        logo.alt = '42 Logo';
        logo.height = 30;
        logo.className = 'me-2';

        // Create text node
        const text = document.createTextNode(btnText);

        // Append elements
        this.button.appendChild(logo);
        this.button.appendChild(text);
        this.container.appendChild(this.button);
    }

    render() {
        return this.button;
    }
}

export default Button42;