from django_filters import CharFilter
from django.db import models
from vstutils.models import BModel
from vstutils.api import fields
from .hosts import Host


class ModelWithFK(BModel):
    some_fk = models.ForeignKey('test_proj.Host', on_delete=models.CASCADE,
                                null=True, default=None, blank=True)

    class Meta:
        _list_fields = (
            'id',
            'some_fk'
        )
        _override_list_fields = {
            'some_fk': fields.FkModelField(select=Host.generated_view.serializer_class)
        }


class ModelWithBinaryFiles(BModel):
    some_binfile = models.TextField(default='')
    some_namedbinfile = models.TextField(default='')
    some_namedbinimage = models.TextField(default='')
    some_multiplenamedbinfile = models.TextField(default='')
    some_multiplenamedbinimage = models.TextField(default='')

    class Meta:
        _list_fields = (
            'id',
            'some_binfile',
            'some_namedbinfile',
            'some_namedbinimage',
            'some_multiplenamedbinfile',
            'some_multiplenamedbinimage',
        )
        _override_list_fields = dict(
            some_binfile=fields.BinFileInStringField(required=False),
            some_namedbinfile=fields.NamedBinaryFileInJsonField(required=False),
            some_namedbinimage=fields.NamedBinaryImageInJsonField(required=False),
            some_multiplenamedbinfile=fields.MultipleNamedBinaryFileInJsonField(required=False),
            some_multiplenamedbinimage=fields.MultipleNamedBinaryImageInJsonField(required=False)
        )
        _filterset_fields = {
            'some_binfile': CharFilter(label='Some label for binfile')
        }
