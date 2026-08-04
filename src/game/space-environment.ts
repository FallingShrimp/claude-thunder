import { BaseEnvironment } from "../core/environment";

interface Star {
    x: number;
    y: number;
    radius: number;
    speed: number;
    opacity: number;
}

export class SpaceEnvironment extends BaseEnvironment {
    private readonly stars: Star[];

    public constructor(width: number, height: number, starCount: number = 100) {
        super(
            { width, height },
            { shape: "rectangle", color: "#02040f" },
        );

        this.stars = Array.from(
            { length: starCount },
            () => this.createStar(Math.random() * height),
        );
    }

    public override update(delta: number): void {
        for (const star of this.stars) {
            star.y += star.speed * delta;

            if (star.y - star.radius > this.size.height) {
                Object.assign(star, this.createStar(-star.radius));
            }
        }
    }

    public override draw(context: CanvasRenderingContext2D): void {
        context.fillStyle = this.appearance.color;
        context.fillRect(
            this.position.x,
            this.position.y,
            this.size.width,
            this.size.height,
        );

        for (const star of this.stars) {
            context.beginPath();
            context.globalAlpha = star.opacity;
            context.fillStyle = "#ffffff";
            context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            context.fill();
        }
    }

    private createStar(y: number): Star {
        const depth = Math.random();

        return {
            x: Math.random() * this.size.width,
            y,
            radius: 0.5 + depth * 1.5,
            speed: 20 + depth * 100,
            opacity: 0.35 + depth * 0.65,
        };
    }
}
