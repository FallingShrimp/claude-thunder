import type { BaseEntity } from "../core/entity";
import type { GameSystem } from "./game-system";
import type { GameWorld } from "./game-world";

export abstract class CollisionSystem implements GameSystem {
    public update(world: GameWorld, deltaTime: number): void {
        const entities = world.entities.filter((entity) => entity.active);

        for (let leftIndex = 0; leftIndex < entities.length; leftIndex += 1) {
            const left = entities[leftIndex];

            for (
                let rightIndex = leftIndex + 1;
                rightIndex < entities.length;
                rightIndex += 1
            ) {
                const right = entities[rightIndex];

                if (
                    left === undefined
                    || right === undefined
                    || !left.active
                    || !right.active
                    || !this.shouldTest(left, right)
                    || !this.intersects(left, right)
                ) {
                    continue;
                }

                this.onCollision(left, right, deltaTime);
            }
        }
    }

    protected abstract shouldTest(left: BaseEntity, right: BaseEntity): boolean;

    protected abstract onCollision(
        left: BaseEntity,
        right: BaseEntity,
        deltaTime: number,
    ): void;

    protected intersects(left: BaseEntity, right: BaseEntity): boolean {
        const leftWidth = left.collisionBounds.size.width * left.scale.x;
        const leftHeight = left.collisionBounds.size.height * left.scale.y;
        const rightWidth = right.collisionBounds.size.width * right.scale.x;
        const rightHeight = right.collisionBounds.size.height * right.scale.y;
        const leftX = left.position.x + left.collisionBounds.offset.x;
        const leftY = left.position.y + left.collisionBounds.offset.y;
        const rightX = right.position.x + right.collisionBounds.offset.x;
        const rightY = right.position.y + right.collisionBounds.offset.y;

        return leftX < rightX + rightWidth
            && leftX + leftWidth > rightX
            && leftY < rightY + rightHeight
            && leftY + leftHeight > rightY;
    }
}
