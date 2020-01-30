# pylint: disable=no-member,redefined-outer-name,unused-argument
from warnings import warn
from collections import OrderedDict

from django.urls.conf import include, re_path
from django.conf import settings
from rest_framework import routers, permissions, versioning
from drf_yasg.views import get_schema_view

from .base import Response
from ..utils import import_class


class ProjectApiVersionVersioning(versioning.BaseVersioning):
    def determine_version(self, request, *args, **kwargs):
        return settings.VST_API_VERSION


class _AbstractRouter(routers.DefaultRouter):

    def __init__(self, *args, **kwargs):
        self.custom_urls = list()
        self.permission_classes = kwargs.pop("perms", None)
        self.create_schema = kwargs.pop('create_schema', False)
        super().__init__(*args, **kwargs)

    def _get_custom_lists(self):
        return self.custom_urls

    def _get_views_custom_list(self, view_request, registers):
        routers_list = OrderedDict()
        fpath = view_request.get_full_path().split("?")
        absolute_uri = view_request.build_absolute_uri(fpath[0])
        for prefix, _, name in self._get_custom_lists():
            path = ''.join([
                absolute_uri, prefix, f'?{fpath[1]}' if len(fpath) > 1 else ""
            ])
            routers_list[name] = path
        routers_list.update(registers.data)
        return routers_list

    def get_default_base_name(self, viewset):
        base_name = getattr(viewset, 'base_name', None)
        if base_name is not None:
            return base_name  # nocv
        queryset = getattr(viewset, 'queryset', None)
        model = getattr(viewset, 'model', None)
        if queryset is None:  # nocv
            assert model is not None, \
                '`base_name` argument not specified, and could ' \
                'not automatically determine the name from the viewset, as ' \
                'it does not have a `.queryset` or `.model` attribute.'
            return model._meta.object_name.lower()
        # can't be tested because this initialization takes place before any
        # test code can be run
        return super().get_default_base_name(viewset)  # nocv

    def register_view(self, prefix, view, name=None):
        if getattr(view, 'as_view', None):
            name = name or view().get_view_name().lower()
            self.custom_urls.append((prefix, view, name))
            return
        name = name or view.get_view_name().lower()
        self.custom_urls.append((prefix, view, name))

    def _unreg(self, prefix, objects_list):
        del self._urls
        index = 0
        for reg_prefix, _, _ in objects_list:
            if reg_prefix == prefix:
                del objects_list[index]
                break
            index += 1  # nocv
        return objects_list

    def unregister_view(self, prefix):
        self.custom_urls = self._unreg(prefix, self.custom_urls)  # nocv

    def unregister(self, prefix):
        self.registry = self._unreg(prefix, self.registry)

    def generate(self, views_list):
        for prefix, options in views_list.items():
            args = [prefix, import_class(options['view']), options.get('name', None)]
            if options.get('type', 'viewset') == 'viewset':
                self.register(*args)
            elif options.get('type', 'viewset') == 'view':  # nocv
                self.register_view(*args)
            else:  # nocv
                raise Exception('Unknown type of view')


class APIRouter(_AbstractRouter):
    root_view_name = 'v1'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.create_schema:
            self.__register_schema()

    def __register_schema(self, name='schema'):
        try:
            self.register_view(rf'{name}', self._get_schema_view(), name)
        except BaseException as exc:  # nocv
            warn(f"Couldn't attach schema view: {exc}")

    def _get_schema_view(self):
        from rest_framework import schemas
        return schemas.get_schema_view(title=self.root_view_name)

    def get_api_root_view(self, *args, **kwargs):
        list_name = self.routes[0].name
        mapping = ((reg[0], list_name.format(basename=reg[2])) for reg in self.registry)
        api_root_dict = OrderedDict(mapping)

        class API(self.APIRootView):
            root_view_name = self.root_view_name
            if self.permission_classes:
                permission_classes = self.permission_classes
            custom_urls = self.custom_urls

            class versioning_class(versioning.BaseVersioning):
                # pylint: disable=invalid-name,no-self-argument

                def determine_version(self_ver, request, *args, **kwargs):
                    return self.root_view_name

            def get_view_name(self): return self.root_view_name

            def get(self_inner, request, *args, **kwargs):
                # pylint: disable=no-self-argument,protected-access
                data = self._get_views_custom_list(
                    request, super(API, self_inner).get(request, *args, **kwargs)
                )
                return Response(data, 200).resp

        return API.as_view(api_root_dict=api_root_dict)

    def get_urls(self):
        urls = super().get_urls()
        for prefix, view, _ in self.custom_urls:  # nocv
            view = view.as_view() if hasattr(view, 'as_view') else view
            urls.append(re_path(f"^{prefix}/$", view))
        return urls

    def generate(self, views_list):
        if r'_lang' not in views_list:
            views_list['_lang'] = {
                'view': 'vstutils.api.views.LangViewSet'
            }

        super().generate(views_list)

        if r'_bulk' not in views_list:
            view_class = import_class('vstutils.api.views.BulkViewSet')
            view_class.root_view_name = self.root_view_name
            self.register_view(r'_bulk', view_class, '_bulk')


class MainRouter(_AbstractRouter):
    routers = []

    def __register_openapi(self):
        # pylint: disable=import-error
        view_kwargs = dict(public=settings.OPENAPI_PUBLIC)
        if view_kwargs['public']:  # nocv
            view_kwargs['permission_classes'] = (permissions.AllowAny,)
        schema_view = get_schema_view(**view_kwargs)
        swagger_kwargs = dict()
        cache_timeout = settings.SCHEMA_CACHE_TIMEOUT
        swagger_kwargs['cache_timeout'] = 0 if settings.DEBUG else cache_timeout
        schema_view.versioning_class = ProjectApiVersionVersioning
        self.register_view(
            'openapi', schema_view.with_ui('swagger', **swagger_kwargs), name='openapi'
        )

    def _get_custom_lists(self):
        return super()._get_custom_lists() + self.routers

    def get_api_root_view(self, *args, **kwargs):
        list_name = self.routes[0].name
        mapping = ((reg[0], list_name.format(basename=reg[2])) for reg in self.registry)
        api_root_dict = OrderedDict(mapping)

        class API(self.APIRootView):
            if self.permission_classes:
                permission_classes = self.permission_classes
            routers = self.routers
            custom_urls = self.custom_urls
            versioning_class = ProjectApiVersionVersioning
            view_name = f'{settings.PROJECT_GUI_NAME} REST API'

            def get_view_name(self): return 'REST API'

            def get(self_inner, request, *args, **kwargs):
                # pylint: disable=no-self-argument,protected-access
                links = self._get_views_custom_list(
                    request, super(API, self_inner).get(request, *args, **kwargs)
                )
                data = {
                    'description': self_inner.view_name,
                    'current_version': links[settings.VST_API_VERSION],
                    'available_versions': {
                        name: links[name]
                        for name in links
                        if name in settings.API
                    }
                }
                for link in links:
                    if link not in data['available_versions']:
                        data[link] = links[link]
                return Response(data, 200).resp

        return API.as_view(api_root_dict=api_root_dict)

    def register_router(self, prefix, router, name=None):
        name = name or router.root_view_name
        self.routers.append((prefix, router, name))

    def unregister_router(self, prefix):
        self.routers = self._unreg(prefix, self.routers)  # nocv

    def get_urls(self):
        urls = super().get_urls()
        for prefix, router, _ in self.routers:
            urls.append(re_path(
                prefix,
                include(
                    (router.urls, settings.VST_PROJECT),
                    namespace=router.root_view_name
                )
            ))
        for prefix, view, _ in self.custom_urls:  # nocv
            # can't be tested because this initialization takes place before
            # any test code can be run
            view = view.as_view() if hasattr(view, 'as_view') else view
            urls.append(re_path(f"^{prefix}/$", view))
        return urls

    def generate_routers(self, api, create_schema=None, create_swagger=None):
        for version, views_list in api.items():
            router = APIRouter(
                perms=(permissions.IsAuthenticated,),
                create_schema=create_schema or self.create_schema,
            )
            router.root_view_name = version
            router.generate(views_list)
            self.register_router(version+'/', router)

        self.__register_openapi()
