from cpython.dict cimport (
    PyDict_New, PyDict_Copy, PyDict_Items,
    PyDict_Update, PyDict_SetItemString, PyDict_SetItem
)
import os
from configparser import ConfigParser as BaseConfigParser
import six
import pytimeparse
from .tools import get_file_value

try:
    xrange
except:
    xrange = range


cdef class Section:
    config = None
    section = 'main'
    subsections = []
    section_defaults = {}
    types_map = {}
    kwargs = {}

    cdef dict _subsections, __default__, __settings__

    def __cinit__(self, str section = '', dict default = PyDict_New()):
        self.section = section or self.section
        self._subsections = self.get_subsections()
        if default:
            self.__default__ = PyDict_Copy(default)
        else:
            self.__default__ = None

    cdef dict get_subsections(self):
        cdef dict result = <dict>PyDict_New()
        for sub in self.subsections:
            PyDict_SetItem(result, sub, self.section + '.' + sub)
        return result

    def get_value_kwargs(self, **additional_kwargs):
        cdef dict kwargs = PyDict_New()
        PyDict_Update(kwargs, self.kwargs)
        PyDict_Update(kwargs, additional_kwargs)
        PyDict_SetItemString(kwargs, '__section', self.section)
        return kwargs

    def opt_handler(self, option):
        return option.upper()

    def key_handler(self, key):
        return key

    def value_handler(self, value):
        if isinstance(value, (six.string_types, six.text_type)):
            return value.format(**self.get_value_kwargs())
        return value

    cdef dict __get_default_data_from_section__(self, option):
        if self.__default__:
            return self.__default__
        return self.section_defaults.get(option if option else '.', {})

    def get_default_data_from_section(self, option):
        return self.__get_default_data_from_section__(option)

    def get_from_section(self, section, option=None):
        default_value = self.__get_default_data_from_section__(option)
        try:
            return self.config[section] or default_value
        except:
            return default_value

    cdef dict _get_section_data(self, section, option=None):
        cdef dict section_data = <dict>PyDict_New()
        for key, value in self.get_from_section(section, option).items():
            key_name = key if not option else "{}.{}".format(option, key)
            type_handler = self.types_map.get(key_name, str)
            PyDict_SetItem(
                section_data,
                self.key_handler(key),
                type_handler(self.value_handler(value))
            )
        return section_data

    cdef dict _all(self):
        self._current_section = self.section
        cdef dict settings = self._get_section_data(self.section)
        for option, section in PyDict_Items(self._subsections):
            self._current_section = option
            PyDict_SetItem(
                settings,
                self.opt_handler(option),
                self._get_section_data(section, option)
            )
        return settings

    def all(self):
        settings = getattr(self, '__settings__', None)
        if settings is None:
            self.__settings__ = self._all()
        return self.__settings__

    def get(self, option, fallback=None):
        return self.all().get(option, self.value_handler(fallback))

    def getboolean(self, option, fallback=None):
        return self.bool(self.get(option, fallback))

    def getint(self, option, fallback=None):
        value = self.get(option, str(fallback)).strip()
        return self.int(value)

    def getseconds(self, option, fallback=None):
        return self.int_seconds(self.get(option, str(fallback)))

    def getlist(self, option, fallback=None, separator=','):
        fallback = fallback or ''
        return self.comma_list(self.get(option, fallback), separator)

    @classmethod
    def comma_list(cls, value, separator=','):
        return tuple(filter(bool, value.split(separator)))

    @classmethod
    def int_seconds(cls, value):
        value = pytimeparse.parse(str(value)) or value
        return int(value)

    @classmethod
    def int(cls, value):
        if not isinstance(value, (six.string_types, six.text_type)):
            value = str(value)
        value = value.replace('K', '0' * 3)
        value = value.replace('M', '0' * 6)
        value = value.replace('G', '0' * 9)
        return int(float(value))

    @classmethod
    def bool(cls, value):
        if not isinstance(value, bool):
            value = value.replace('False', '')
            value = value.replace('false', '')
        return bool(value)


class ConfigParser(BaseConfigParser):

    def read(self, filenames, encoding=None):
        if isinstance(filenames, (str, os.PathLike)):
            filenames = [filenames]
        read_ok = []
        for filename in filenames:
            data = get_file_value(filename, default='')
            if not data:
                continue
            self.read_string(data, filename)
            if isinstance(filename, os.PathLike):
                filename = os.fspath(filename)
            read_ok.append(filename)
        return read_ok
