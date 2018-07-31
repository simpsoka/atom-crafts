'use babel';

import Color from 'color';
import { Emitter } from 'atom';

const errors = {
  'palette-color'  : 'Color data is invalid',
  'format'         : 'Format is not valid JSON',
  'template-props' : 'Design requires both template and palette properties',
  'template-array' : 'Template property must be an array of strings',
  'template-rowlen': 'Template rows must all be the same length',
  'template-other' : 'Design is invalid. Make sure your formatting is correct.'
}

export default class AtomCraftsProject {

  constructor(design, options) {
    const defaults = {
      pixelSize: 20,
      isEditable: true
    }

    this.emitter = new Emitter();
    this.options = {...defaults, ...options}

    if (design) {
      this.design = design;
    }
  }

  set design(value) {
    if (this._design) {
      this.destroy();
    }
    if ((typeof value) === 'string') {
      try {
        value = JSON.parse(value)
      } catch(error) {
        throw new Error(errors['format']);
      }
    }

    if (this.isValidDesign(value)) {
      this._design = value;
      this.palette = value.palette;
      this.template = value.template;
    }
  }

  get design() {
    return this._design;
  }

  get isValid() {
    return Boolean(this.template);
  }

  get imageData() {
    let colorData = [];
    this.template.forEach(element => {
      element.forEach(color => {
        const colorFormat = this.colorToCanvasColor(color);
        colorData = [...colorData, ...colorFormat];
      });
    });

    colorData = Uint8ClampedArray.from(colorData);

    return new ImageData(colorData, this.cols, this.rows);
  }

  get cols() {
    return this.template[0].length;
  }

  get rows() {
    return this.template.length;
  }

  set palette(value) {
    this._palette = {};
    for (color in value) {
      this._palette[color] = this.colorForString(value[color]);
    }
  }

  get palette() {
    return this._palette;
  }

  set templateDesign(colors) {
    this.design.template = colors.map(row => {
      return row.map(color => {
        return this.palleteNameForColor(color);
      }).join(', ');
    })
  }

  set template(value) {
    this._template = value.map(r => {
      r = r.split(', ');
      return r.map(i => {
        const color = this.palette[i];
        return color;
      });
    });
  }

  get template() {
    return this._template;
  }

  get canvas() {
    if (!this._canvas) {
      const scale = this.options.pixelSize;
      const width = this.cols;
      const height = this.rows;

      let tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = width;
      tmpCanvas.height = height;

      const tmpCtx = tmpCanvas.getContext('2d');
      tmpCtx.putImageData(this.imageData, 0, 0);

      this._canvas = document.createElement('canvas');
      this._canvas.width = width * scale;
      this._canvas.height = height * scale;

      const ctx = this._canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.scale(scale, scale);
      ctx.drawImage(tmpCanvas, 0, 0);

      tmpCanvas = null;

      if (this.options.isEditable) {
        this.addCanvasListeners()
      }
    }

    return this._canvas;
  }

  get image() {
    if (!this._image) {
      this._image = new Image();
      this._image.src = this.canvas.toDataURL();
    }
    return this._image;
  }

  addCanvasListeners() {
    this.canvas.addEventListener('mousemove', this.onMousemove.bind(this));
    this.canvas.addEventListener('mousedown', this.onMousedown.bind(this));
    this.canvas.addEventListener('mouseout', this.onMouseout.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseup.bind(this));
    this.canvas.addEventListener('click', this.onClick.bind(this));
  }

  onMousemove(e) {
    const position = this.offsetToPixelIndex(e.offsetX, e.offsetY);

    if (!this.position ||
      ((position[0] != this.position[0]) ||
      (position[1] != this.position[1]))) {

      this.position = position;
        this.emitter.emit('didChangeGridPosition', this.position);

      if (this.isEditing) {
        this.modifyPixelAt(position);
      }
    }
  }

  onMouseout(e) {
    if (this.isEditing) {
      this.isEditing = false;
      this.emitter.emit('dataDidChange', this.design);
    }
  }

  onMousedown(e) {
    this.isEditing = true;
    this.position = null;
  }

  onMouseup(e) {
    this.isEditing = false;
    this.emitter.emit('dataDidChange', this.design);
  }

  onClick(e) {
    const position = this.offsetToPixelIndex(e.offsetX, e.offsetY);
    this.modifyPixelAt(position);
    this.emitter.emit('dataDidChange', this.design);
  }

  pad(p) {
    p = {...{
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }, ...p}
    const times = x => f => {
      if (x > 0) {
        f()
        times (x - 1) (f)
      }
    }
    const color = this.palette['_'] || this.palette[this.selectedColor];
    let template = this.template;
    const row = [];
    times (this.cols) (() => row.push(color))
    times (p.top) (() => template.unshift(row))
    times (p.bottom) (() => template.push(row))

    template = template.map(r => {
      times (p.left) (() => r.unshift(color));
      times (p.right) (() => r.push(color));
      return r;
    });

    this.templateDesign = template;
    this.emitter.emit('dataDidChange', this.design);
  }

  modifyPixelAt(pos) {
    const ctx = this._canvas.getContext('2d');
    let color = this.palette[this.selectedColorName];

    if (color.alpha() == 0) {
      // makes editing visible
      color = color.alpha(0.5)
    }

    ctx.fillStyle = color.string();
    ctx.fillRect(pos[0], pos[1], 1, 1);

    const template = this.template;
    template[pos[1]][pos[0]] = this.palette[this.selectedColorName];

    this.templateDesign = template;
  }

  palleteNameForColor(color) {
    for (c in this.palette) {
      if (this.palette[c].string() == color.string()) {
        return c;
      }
    }
  }

  offsetToPixelIndex(x, y) {
    return [Math.floor(x / this.options.pixelSize), Math.floor(y / this.options.pixelSize)];
  }

  colorToCanvasColor(color) {
    return [...color.alpha(1).array(), Math.round(color.alpha() * 255)];
  }

  colorForString(color) {
    try {
      if (color.includes(', ')) {
        color = color.split(', ').map((c, idx) => {
          if (idx == 3) {
            c = parseFloat(c)
            if (c > 1) {
              c = c / 255;
            }
            return c;
          }
          return parseInt(c);
        })
      }
      return Color(color);
    }  catch (error) {
      throw new Error(errors['palette-color']);
    }
  }

  isValidDesign(design) {
    try {
      if (!design.template || !design.palette) {
        throw new Error(errors['template-props']);
      }

      if (!design.template instanceof Array) {
        throw new Error(errors['template-array']);
      }

      let len;
      design.template.forEach(r => {
        const length = r.split(', ').length;
        len = len ? len : length;
        if (length != len) {
          throw new Error(errors['template-rowlen']);
        }
      })
      return true;
    } catch (error) {
      throw new Error(`${error}: ${errors['template-other']}`);
    }
  }

  destroy() {
    this._palette = null;
    this._template = null;
    this._canvas = null;
    this._image = null;
  }
}
