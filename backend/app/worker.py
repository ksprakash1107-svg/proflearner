import asyncio
import signal

from app.core.config import get_settings
from app.core.logging import logger, setup_logging


class Worker:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._running = False

    async def start(self) -> None:
        self._running = True
        logger.info(
            "worker_started",
            poll_interval=self.settings.WORKER_POLL_INTERVAL_SECONDS,
            concurrency=self.settings.WORKER_CONCURRENCY,
        )

        while self._running:
            try:
                # In Phase 0, worker idles. In Phase 4, job queue execution begins.
                await asyncio.sleep(self.settings.WORKER_POLL_INTERVAL_SECONDS)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("worker_loop_error", error=str(e))
                await asyncio.sleep(1)

        logger.info("worker_stopped")

    def stop(self) -> None:
        logger.info("worker_stopping")
        self._running = False


async def main() -> None:
    setup_logging()
    worker = Worker()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, worker.stop)

    await worker.start()


if __name__ == "__main__":
    asyncio.run(main())
