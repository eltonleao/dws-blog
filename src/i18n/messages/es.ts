import type { MessageKey } from './en'

/**
 * The texts of the interface in Spanish. Every key of the English dictionary
 * has to be here: a missing one fails the build.
 */
export const es: Record<MessageKey, string> = {
  'language.label': 'Idioma',

  'search.label': 'Buscar',
  'search.close': 'Cerrar búsqueda',
  'search.clear': 'Borrar búsqueda',

  'list.title': 'Blog de DWS',
  'list.loading': 'Cargando publicaciones',
  'list.empty': 'No se encontraron publicaciones',
  'list.count.one': '{count} publicación',
  'list.count.other': '{count} publicaciones',

  'filters.title': 'Filtros',
  'filters.category': 'Categoría',
  'filters.author': 'Autor',
  'filters.apply': 'Aplicar filtros',
  'filters.clear': 'Borrar filtros',
  'filters.clearCategory': 'Borrar categoría',
  'filters.clearAuthor': 'Borrar autor',

  'sort.label': 'Ordenar por:',
  'sort.newest': 'Más recientes primero',
  'sort.oldest': 'Más antiguas primero',
  'sort.sortedNewest': 'Ordenado: más recientes primero',
  'sort.sortedOldest': 'Ordenado: más antiguas primero',

  'status.error': 'Algo salió mal',
  'status.retry': 'Intentar de nuevo',

  'post.loading': 'Cargando publicación',
  'post.writtenBy': 'Escrito por:',
  'post.latest': 'Últimos artículos',

  'notFound.title': 'Publicación no encontrada',
  'notFound.text':
    'No hay ninguna publicación en esta dirección. Puede que la hayan eliminado o que el enlace sea incorrecto.',
  'notFound.seeAll': 'Ver todas las publicaciones',

  'footer.back': 'Volver al blog',
}
