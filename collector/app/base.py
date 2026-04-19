import abc

from app.models import CollectorBatch


class BaseCollector(abc.ABC):
    @abc.abstractmethod
    def poll(self) -> CollectorBatch:
        raise NotImplementedError
