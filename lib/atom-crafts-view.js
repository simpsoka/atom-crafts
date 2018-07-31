'use babel';

import { Emitter } from 'atom';

export default class AtomCraftsView {

  constructor(serializedState) {
    // Create root element
    this.emitter = new Emitter();
    this.element = document.createElement('div');
    this.element.classList.add('atom-crafts');


    this.createComponents();
  }

  set canvas(value) {
    this.canvasContainer.innerHTML = '';
    this.canvasContainer.appendChild(value);
    this._canvas = value;
  }

  set message(value) {
    if (value) {
      this.alert.textContent = value;
      this.alert.classList.add('active');
    } else {
      this.alert.textContent = '';
      this.alert.classList.remove('active');
    }
  }

  set selectedColor(value) {
    this._selectedColor = value;
    this.emitter.emit('didSelectColorName', value);
  }

  get selectedColor() {
    return this._selectedColor;
  }

  updateLabelHighlight(pos) {
    const labels = [this.colLabels, this.rowLabels]
    labels.forEach((label, idx) => {
      Array.from(label.children).forEach(el => {
        el.classList.remove('active');
      })
      const el = Array.from(label.children)[pos[idx]];
      el.classList.add('active')
    });
  }

  updateLabels(rows, cols) {
    if (!rows || !cols) return;

    if (rows != Array.from(this.rowLabels.children || []).length) {
      this.createLabelsForEl(this.rowLabels, rows);
      this.rows = rows;
    }

    if (cols != Array.from(this.colLabels.children || []).length) {
      this.createLabelsForEl(this.colLabels, cols);
      this.cols = cols;
    }
  }

  updatePalettePicker(palette) {
    if (!this.selectedColor) {
      this.selectedColor = Object.keys(palette)[0];
    }
    this.palettePicker.innerHTML = ''
    for (let color in palette) {
      this.createPaletteColor(palette, color);
    }
  }

  createComponents() {
    this.createCanvasContainer();
    this.createToolbar();
    this.createPalettePicker();
    this.createLabels();
    this.createAlert();
    this.createPaddingPicker();
  }

  createCanvasContainer() {
    this.canvasContainer = document.createElement('div');
    this.canvasContainer.classList.add('atom-crafts-canvas');
    this.element.appendChild(this.canvasContainer);
  }

  createPaddingPicker() {
    this.paddingPicker = document.createElement('div');
    this.paddingPicker.classList.add('atom-crafts-padding-picker');
    const title = document.createElement('span');
    title.textContent = '+ Row';
    this.paddingPicker.appendChild(title);
    this.paddingPicker.addEventListener('click', this.didOpenDropdown.bind(this));
    this.toolbar.appendChild(this.paddingPicker);
    this.createPaddingOptions();
  }

  createPalettePicker() {
    this.palettePicker = document.createElement('div');
    this.palettePicker.classList.add('atom-crafts-palette-picker');
    this.palettePicker.addEventListener('click', this.didOpenDropdown.bind(this));
    this.toolbar.appendChild(this.palettePicker);
  }

  createPaddingOptions() {
    const paddingOptions = ['top', 'right', 'bottom', 'left'];
    paddingOptions.forEach(opt => {
      const el = document.createElement('div');
      el.classList.add('padding-option', opt);
      el.setAttribute('data-padding', opt)
      el.addEventListener('click', this.didSelectPadding.bind(this));
      this.paddingPicker.appendChild(el);
    })
  }

  createPaletteColor(palette, color) {
    const el = document.createElement('div');
    el.classList.add('palette-color');
    if (color == this.selectedColor) {
      el.classList.add('selected')
    }
    el.setAttribute('style', `background-color: ${palette[color].string()}`);
    el.setAttribute('data-color', color)
    el.addEventListener('click', this.didSelectColor.bind(this))
    this.palettePicker.appendChild(el);
  }

  createLabels() {
    this.colLabels = document.createElement('div');
    this.colLabels.classList.add('atom-crafts-labels-cols');
    this.element.appendChild(this.colLabels);

    this.rowLabels = document.createElement('div');
    this.rowLabels.classList.add('atom-crafts-labels-rows');
    this.element.appendChild(this.rowLabels);
  }

  createToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.classList.add('atom-crafts-toolbar');
    this.element.appendChild(this.toolbar);
  }

  createAlert() {
    this.alert = document.createElement('div');
    this.alert.classList.add('atom-crafts-alert');
    this.element.appendChild(this.alert);
  }

  createLabelsForEl(el, length) {
    el.innerHTML = '';
    for (var i = 1; i < length + 1; i++) {
      el.append(this.createLabel(i));
    }
  }

  createLabel(num) {
    const label = document.createElement('span');
    label.classList.add('label', 'line-number');
    label.innerText = num;

    return label;
  }

  didSelectColor(el) {
    const parentEl = el.target.parentElement;
    Array.from(parentEl.children).forEach(el => {
      el.classList.remove('selected');
    });
    parentEl.classList.remove('open');
    el.target.classList.add('selected');
    this.selectedColor = el.target.getAttribute('data-color');
  }

  didSelectPadding(el) {
    const parentEl = el.target.parentElement;
    parentEl.classList.remove('open');
    const attr = el.target.getAttribute('data-padding');
    padding = {}
    padding[attr] = 1;
    this.emitter.emit('didSelectPadding', padding);
  }

  didOpenDropdown(el) {
    if (el.target.classList.contains('open')) {
      el.target.classList.remove('open');
    } else {
      el.target.classList.add('open');
    }
  }

  serialize() {}

  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }


}
