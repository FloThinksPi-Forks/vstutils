from django.conf import settings
from ..utils import import_class
from ..tools import multikeysort
from .. import __version__


manifest_object = import_class(settings.MANIFEST_CLASS)()
gui_version = "_".join(map(str, [
    getattr(settings, 'PROJECT_VERSION', ''),
    getattr(settings, 'PROJECT_LIB_VERSION', ''),
    __version__
]))
static_path = getattr(settings, 'STATIC_URL', '/static/')
static_list = multikeysort(getattr(settings, 'SPA_STATIC', []), ['priority'])
debug_enabled = getattr(settings, 'DEBUG', False)


def settings_constants(request):
    # pylint: disable=unused-argument
    return {
        "login_url": getattr(settings, 'LOGIN_URL', '/login/'),
        "logout_url": getattr(settings, 'LOGOUT_URL', '/logout/'),
        "docs_url": getattr(settings, 'DOC_URL', '/docs/'),
        "has_docs": getattr(settings, 'HAS_DOCS', False),
        "timezone": getattr(settings, 'TIME_ZONE', 'UTC'),
        "debug": debug_enabled
    }


def project_args(request):
    host_url = request.build_absolute_uri('/')[:-1]
    ver_key = "{}_version".format(getattr(settings, 'VST_PROJECT', "vstutils"))
    return {
        "host_url": host_url,
        "gui_version": gui_version,
        "project_version": getattr(settings, 'PROJECT_VERSION', ''),
        ver_key: getattr(settings, 'PROJECT_VERSION', False),
        "project_gui_name": getattr(settings, 'PROJECT_GUI_NAME', None),
        "project_menu": getattr(settings, 'PROJECT_GUI_MENU', []),
        "openapi_url": '/{}/openapi/'.format(settings.VST_API_URL),
        "api_version": getattr(settings, 'VST_API_VERSION'),
        "api_url": '{}/{}/{}/'.format(
            host_url, settings.VST_API_URL, settings.VST_API_VERSION
        ),
        "enable_gravatar": settings.ENABLE_GRAVATAR,
    }


def pwa_context(request):
    return {
        "manifest_object": manifest_object,
        "static_files_list": static_list,
        "block_timeout": 86400 if not debug_enabled else 1,
    }


def headers_context(request):
    result = dict(request.META)
    result['HTTP_X_APP'] = result.get('HTTP_X_APP', 'browser')
    return dict(metadata=result)
