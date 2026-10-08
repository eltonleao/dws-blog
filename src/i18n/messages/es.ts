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
  'post.back': 'Volver',

  'notFound.title': 'Publicación no encontrada',
  'notFound.text':
    'No hay ninguna publicación en esta dirección. Puede que la hayan eliminado o que el enlace sea incorrecto.',
  'notFound.seeAll': 'Ver todas las publicaciones',

  'chunk.loading': 'Cargando la caza de errores…',
  'chunk.failed': 'No se pudo cargar la caza de errores.',
  'chunk.reload': 'Recargar',

  'footer.back': 'Volver al blog',

  'comments.heading': 'Comentarios',
  'comments.title.one': '{count} comentario',
  'comments.title.other': '{count} comentarios',
  'comments.loading': 'Cargando comentarios',
  'comments.empty': 'Todavía no hay comentarios. Sé el primero.',
  'comments.unavailable': 'Los comentarios no están disponibles en este momento',
  'comments.visitorFailed': 'No se pudo iniciar tu sesión de visitante',
  'comments.sendFailed': 'Tu comentario no se envió. Inténtalo de nuevo en un minuto.',
  'comments.deleteFailed': 'Tu comentario no se eliminó. Inténtalo de nuevo.',
  'comments.label': 'Tu comentario',
  'comments.submit': 'Publicar comentario',
  'comments.visitor': 'Comentas como {name}',
  'comments.leave': 'Salir',
  'comments.delete': 'Eliminar comentario',
}
