import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

interface FuelPriceCardConfig {
  entity: string;
  name?: string;
  min_entity: string;
  max_entity: string;
  layout?: "vertical" | "horizontal";
  show_logo?: boolean;
  show_color?: boolean;
}

interface HomeAssistant {
  states: Record<
    string,
    { state: string; attributes: Record<string, unknown> }
  >;
  callService: (
    domain: string,
    service: string,
    data: Record<string, unknown>
  ) => void;
}

@customElement("fuel-price-card")
export class FuelPriceCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: FuelPriceCardConfig;

  static getConfigElement() {
    return document.createElement("fuel-price-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "",
      min_entity: "",
      max_entity: "",
      layout: "vertical",
      show_logo: true,
      show_color: true,
    };
  }

  setConfig(config: FuelPriceCardConfig) {
    if (!config.entity) {
      throw new Error("Please define an entity");
    }
    if (!config.min_entity) {
      throw new Error("Please define min_entity");
    }
    if (!config.max_entity) {
      throw new Error("Please define max_entity");
    }
    this._config = {
      layout: "vertical",
      show_logo: true,
      show_color: true,
      ...config,
    };
  }

  private _getEntityPicture(): string | null {
    const entityState = this.hass.states[this._config.entity];
    if (!entityState) return null;

    // 1. Check if the sensor has entity_picture
    if (entityState.attributes.entity_picture) {
      return entityState.attributes.entity_picture as string;
    }

    // 2. Try to find the device_tracker for this station
    // Convert sensor.bp_aveiro_gasoleo -> device_tracker.bp_aveiro_location
    const sensorId = this._config.entity.replace("sensor.", "");
    const parts = sensorId.split("_");
    // Remove the last part (fuel type like gasoleo_simples, gasolina_simples_95)
    // Find where the fuel type starts
    const fuelTypes = ["gasoleo", "gasolina", "gpl", "gnc"];
    let stationParts: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (fuelTypes.includes(parts[i])) {
        stationParts = parts.slice(0, i);
        break;
      }
    }

    if (stationParts.length > 0) {
      const deviceTrackerId = `device_tracker.${stationParts.join(
        "_"
      )}_location`;
      const deviceTrackerState = this.hass.states[deviceTrackerId];
      if (deviceTrackerState?.attributes?.entity_picture) {
        return deviceTrackerState.attributes.entity_picture as string;
      }
    }

    return null;
  }

  private _getColorFromPercentage(percentage: number): {
    red: number;
    green: number;
  } {
    const red = Math.round(percentage * 255);
    const green = Math.round((1 - percentage) * 255);
    return { red, green };
  }

  private _calculatePercentage(
    current: number,
    min: number,
    max: number
  ): number {
    const range = max - min;
    if (range <= 0) return 0;
    return Math.max(0, Math.min(1, (current - min) / range));
  }

  protected render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    const entityState = this.hass.states[this._config.entity];
    const minState = this.hass.states[this._config.min_entity];
    const maxState = this.hass.states[this._config.max_entity];

    if (!entityState || !minState || !maxState) {
      return html`
        <ha-card>
          <div class="error">Entity not found</div>
        </ha-card>
      `;
    }

    const currentValue = parseFloat(entityState.state);
    const minValue = parseFloat(minState.state);
    const maxValue = parseFloat(maxState.state);
    const percentage = this._calculatePercentage(
      currentValue,
      minValue,
      maxValue
    );
    const { red, green } = this._getColorFromPercentage(percentage);

    const entityPicture = this._getEntityPicture();
    const name =
      this._config.name ||
      entityState.attributes.friendly_name ||
      this._config.entity;

    const borderStyle =
      this._config.show_color !== false
        ? this._config.layout === "horizontal"
          ? `border-left: 5px solid rgb(${red}, ${green}, 0); box-shadow: -5px 0 10px rgba(${red}, ${green}, 0, 0.3);`
          : `border: 3px solid rgb(${red}, ${green}, 0); box-shadow: 0 0 10px rgba(${red}, ${green}, 0, 0.5);`
        : "";

    return html`
      <ha-card
        class="fuel-card ${this._config.layout}"
        style="${borderStyle}"
        @click="${this._handleClick}"
      >
        <div class="content">
          ${this._config.show_logo && entityPicture
            ? html`
                <div class="logo-container">
                  <img src="${entityPicture}" alt="logo" class="logo" />
                </div>
              `
            : html`
                <div
                  class="icon-container"
                  style="background-color: rgba(${red}, ${green}, 0, 0.3);"
                >
                  <ha-icon
                    icon="mdi:gas-station"
                    style="color: rgb(${red}, ${green}, 0);"
                  ></ha-icon>
                </div>
              `}
          <div class="info">
            <div class="name">${name}</div>
            <div class="price">${currentValue.toFixed(3)}€</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _handleClick() {
    const event = new CustomEvent("hass-more-info", {
      detail: { entityId: this._config.entity },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }

      ha-card {
        cursor: pointer;
        transition: all 0.3s ease;
        border-radius: 12px;
        overflow: hidden;
      }

      ha-card:hover {
        transform: scale(1.02);
      }

      .fuel-card.vertical {
        padding: 16px;
      }

      .fuel-card.vertical .content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 8px;
      }

      .fuel-card.horizontal {
        padding: 12px 16px;
      }

      .fuel-card.horizontal .content {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 16px;
      }

      .logo-container {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .logo {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .icon-container {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .icon-container ha-icon {
        --mdc-icon-size: 24px;
      }

      .info {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
        overflow: hidden;
      }

      .fuel-card.vertical .info {
        align-items: center;
        text-align: center;
      }

      .fuel-card.horizontal .info {
        align-items: flex-start;
      }

      .name {
        font-size: 13px;
        font-weight: 500;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .price {
        font-size: 16px;
        font-weight: 600;
        color: var(--primary-text-color);
      }

      .error {
        padding: 16px;
        color: var(--error-color);
      }
    `;
  }

  getCardSize() {
    return this._config?.layout === "horizontal" ? 1 : 2;
  }
}

// Schema for ha-form (same pattern as Mushroom)
const EDITOR_SCHEMA = [
  { name: "entity", selector: { entity: { domain: "sensor" } } },
  { name: "name", selector: { text: {} } },
  { name: "min_entity", selector: { entity: { domain: "sensor" } } },
  { name: "max_entity", selector: { entity: { domain: "sensor" } } },
  {
    name: "layout",
    selector: {
      select: {
        options: [
          { value: "vertical", label: "Vertical" },
          { value: "horizontal", label: "Horizontal" },
        ],
      },
    },
  },
  { name: "show_logo", selector: { boolean: {} } },
  { name: "show_color", selector: { boolean: {} } },
];

const EDITOR_LABELS: Record<string, string> = {
  entity: "Entity (Fuel Price Sensor)",
  name: "Name (optional)",
  min_entity: "Min Entity (Helper Sensor)",
  max_entity: "Max Entity (Helper Sensor)",
  layout: "Layout",
  show_logo: "Show Brand Logo",
  show_color: "Show Color Indication",
};

// Editor for visual configuration using ha-form (Mushroom pattern)
@customElement("fuel-price-card-editor")
export class FuelPriceCardEditor extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config?: FuelPriceCardConfig;

  public setConfig(config: FuelPriceCardConfig): void {
    this._config = config;
  }

  private _computeLabel = (schema: { name: string }) => {
    return EDITOR_LABELS[schema.name] || schema.name;
  };

  protected render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${EDITOR_SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    const event = new CustomEvent("config-changed", {
      detail: { config: ev.detail.value },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

// Register the card
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "fuel-price-card",
  name: "Fuel Price Card",
  description:
    "A card to display fuel prices with dynamic color coding based on price comparison",
  preview: true,
  documentationURL: "https://github.com/your-username/fuel-price-card",
});

console.info(
  `%c FUEL-PRICE-CARD %c v1.0.0 `,
  "color: white; background: #4CAF50; font-weight: bold;",
  "color: #4CAF50; background: white; font-weight: bold;"
);
