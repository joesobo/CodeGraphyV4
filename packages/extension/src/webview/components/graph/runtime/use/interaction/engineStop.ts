type PhysicsStabilizedMessage = {
  type: 'PHYSICS_STABILIZED';
};

type PhysicsStabilizedMessageSender = (message: PhysicsStabilizedMessage) => void;

export function postPhysicsStabilized(sendMessage: PhysicsStabilizedMessageSender): void {
  sendMessage({ type: 'PHYSICS_STABILIZED' });
}
