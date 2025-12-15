import { LitElement } from "lit";
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
    states: Record<string, {
        state: string;
        attributes: Record<string, unknown>;
    }>;
    callService: (domain: string, service: string, data: Record<string, unknown>) => void;
}
export declare class FuelPriceCard extends LitElement {
    hass: HomeAssistant;
    private _config;
    static getConfigElement(): HTMLElement;
    static getStubConfig(): {
        entity: string;
        min_entity: string;
        max_entity: string;
        layout: string;
        show_logo: boolean;
        show_color: boolean;
    };
    setConfig(config: FuelPriceCardConfig): void;
    private _getEntityPicture;
    private _getColorFromPercentage;
    private _calculatePercentage;
    protected render(): import("lit-html").TemplateResult<1>;
    private _handleClick;
    static get styles(): import("lit").CSSResult;
    getCardSize(): 1 | 2;
}
export declare class FuelPriceCardEditor extends LitElement {
    hass: HomeAssistant;
    private _config?;
    setConfig(config: FuelPriceCardConfig): void;
    private _computeLabel;
    protected render(): import("lit-html").TemplateResult<1>;
    private _valueChanged;
}
export {};
//# sourceMappingURL=fuel-price-card.d.ts.map